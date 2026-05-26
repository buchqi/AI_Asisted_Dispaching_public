"""
Rule-based scoring service.

This phase stores transparent, deterministic score results.
LLM explanations and ML ranking are intentionally out of scope.
"""

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.load import Load
from app.models.load_snapshot import LoadSnapshot
from app.models.scoring_preference import ScoringPreference
from app.models.scoring_result import ScoringResult
from app.models.truck_search_session import TruckSearchSession
from app.models.user import User
from app.schemas.scoring import ScoringPreferenceUpdate
from app.services.membership_service import require_company_member


def normalize_list(values: list[Any] | None) -> set[str]:
    if not values:
        return set()

    return {str(value).strip().lower() for value in values}


def get_or_create_preferences(
    db: Session,
    *,
    company_id: int,
    current_user: User,
) -> ScoringPreference:
    """
    Return current user's scoring preferences for a company.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    preferences = (
        db.query(ScoringPreference)
        .filter(
            ScoringPreference.company_id == company_id,
            ScoringPreference.dispatcher_user_id == current_user.id,
        )
        .first()
    )

    if preferences:
        return preferences

    preferences = ScoringPreference(
        company_id=company_id,
        dispatcher_user_id=current_user.id,
        preferred_origin_states=[],
        preferred_destination_states=[],
        preferred_brokers=[],
        avoided_brokers=[],
    )

    db.add(preferences)
    db.commit()
    db.refresh(preferences)

    return preferences


def update_preferences(
    db: Session,
    *,
    company_id: int,
    current_user: User,
    data: ScoringPreferenceUpdate,
) -> ScoringPreference:
    """
    Update current user's scoring preferences for a company.
    """

    preferences = get_or_create_preferences(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(preferences, field, value)

    db.add(preferences)
    db.commit()
    db.refresh(preferences)

    return preferences


def score_snapshot(
    *,
    snapshot: LoadSnapshot,
    load: Load,
    preferences: ScoringPreference,
) -> tuple[float, dict[str, Any]]:
    """
    Calculate a transparent 0-100-ish rule-based score.
    """

    score = 0.0
    breakdown: dict[str, Any] = {}
    posted_rate = snapshot.posted_rate
    miles = snapshot.miles

    if posted_rate is not None:
        base_points = min(posted_rate / 100, 30)
        min_rate_bonus = 0

        if preferences.min_rate is not None:
            if posted_rate >= preferences.min_rate:
                min_rate_bonus = 5
                reason = "Rate is at or above minimum."
            else:
                min_rate_bonus = -5
                reason = "Rate is below minimum."
        else:
            reason = "Rate scored with capped rate points."

        points = (base_points + min_rate_bonus) * preferences.rate_weight
        score += points
        breakdown["posted_rate"] = {
            "points": points,
            "value": posted_rate,
            "reason": reason,
        }
    else:
        breakdown["posted_rate"] = {
            "points": 0,
            "reason": "No posted rate available.",
        }

    if posted_rate is not None and miles and miles > 0:
        rpm = posted_rate / miles
        base_points = min(rpm * 10, 30)
        rpm_bonus = 0

        if preferences.min_rate_per_mile is not None:
            if rpm >= preferences.min_rate_per_mile:
                rpm_bonus = 5
                reason = "Rate per mile is at or above minimum."
            else:
                rpm_bonus = -5
                reason = "Rate per mile is below minimum."
        else:
            reason = "Rate per mile scored with capped RPM points."

        points = (base_points + rpm_bonus) * preferences.rpm_weight
        score += points
        breakdown["rpm"] = {
            "points": points,
            "value": rpm,
            "reason": reason,
        }
    else:
        breakdown["rpm"] = {
            "points": 0,
            "reason": "Rate per mile unavailable.",
        }

    if miles is not None:
        if preferences.max_miles is not None:
            if miles <= preferences.max_miles:
                points = 10 * preferences.mileage_weight
                reason = "Miles are within preferred maximum."
            else:
                points = -10 * preferences.mileage_weight
                reason = "Miles exceed preferred maximum."
        else:
            points = (5 if miles <= 1000 else 2) * preferences.mileage_weight
            reason = "Mileage scored with default simple rule."

        score += points
        breakdown["mileage"] = {
            "points": points,
            "value": miles,
            "reason": reason,
        }
    else:
        breakdown["mileage"] = {
            "points": 0,
            "reason": "Mileage unavailable.",
        }

    preferred_origins = normalize_list(preferences.preferred_origin_states)
    origin_state = (load.origin_state or "").strip().lower()
    origin_points = (
        10 * preferences.origin_weight
        if origin_state and origin_state in preferred_origins
        else 0
    )
    score += origin_points
    breakdown["origin"] = {
        "points": origin_points,
        "value": load.origin_state,
        "reason": (
            "Preferred origin state."
            if origin_points
            else "Origin state not preferred or no preference set."
        ),
    }

    preferred_destinations = normalize_list(
        preferences.preferred_destination_states
    )
    destination_state = (load.destination_state or "").strip().lower()
    destination_points = (
        10 * preferences.destination_weight
        if destination_state and destination_state in preferred_destinations
        else 0
    )
    score += destination_points
    breakdown["destination"] = {
        "points": destination_points,
        "value": load.destination_state,
        "reason": (
            "Preferred destination state."
            if destination_points
            else "Destination state not preferred or no preference set."
        ),
    }

    broker = (load.broker_name or "").strip().lower()
    preferred_brokers = normalize_list(preferences.preferred_brokers)
    avoided_brokers = normalize_list(preferences.avoided_brokers)
    broker_points = 0.0
    broker_reason = "Broker not preferred or avoided."

    if broker and broker in preferred_brokers:
        broker_points += 10 * preferences.broker_weight
        broker_reason = "Preferred broker."

    if broker and broker in avoided_brokers:
        broker_points -= 20 * preferences.broker_weight
        broker_reason = "Avoided broker."

    score += broker_points
    breakdown["broker"] = {
        "points": broker_points,
        "value": load.broker_name,
        "reason": broker_reason,
    }

    breakdown["driver_preferences"] = {
        "points": 0,
        "reason": "Driver preference scoring not implemented yet.",
    }

    return round(score, 2), breakdown


def calculate_score_for_snapshot(
    db: Session,
    *,
    load_snapshot_id: int,
    current_user: User,
) -> ScoringResult:
    """
    Calculate and store the current user's score for one snapshot.
    """

    snapshot = (
        db.query(LoadSnapshot)
        .options(joinedload(LoadSnapshot.load))
        .filter(LoadSnapshot.id == load_snapshot_id)
        .first()
    )

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load snapshot not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=snapshot.company_id,
    )

    preferences = get_or_create_preferences(
        db=db,
        company_id=snapshot.company_id,
        current_user=current_user,
    )
    score, breakdown = score_snapshot(
        snapshot=snapshot,
        load=snapshot.load,
        preferences=preferences,
    )
    result = (
        db.query(ScoringResult)
        .filter(
            ScoringResult.dispatcher_user_id == current_user.id,
            ScoringResult.load_snapshot_id == snapshot.id,
        )
        .first()
    )

    if result is None:
        result = ScoringResult(
            company_id=snapshot.company_id,
            dispatcher_user_id=current_user.id,
            load_snapshot_id=snapshot.id,
            load_id=snapshot.load_id,
            truck_search_session_id=snapshot.truck_search_session_id,
            score=score,
            breakdown=breakdown,
        )
    else:
        result.score = score
        result.breakdown = breakdown
        result.company_id = snapshot.company_id
        result.load_id = snapshot.load_id
        result.truck_search_session_id = snapshot.truck_search_session_id

    db.add(result)
    db.commit()
    db.refresh(result)

    return result


def calculate_scores_for_truck_search_session(
    db: Session,
    *,
    truck_search_session_id: int,
    current_user: User,
) -> list[ScoringResult]:
    """
    Calculate scores for every snapshot in one truck search session.
    """

    session = (
        db.query(TruckSearchSession)
        .filter(TruckSearchSession.id == truck_search_session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Truck search session not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=session.company_id,
    )

    snapshots = (
        db.query(LoadSnapshot)
        .filter(
            LoadSnapshot.truck_search_session_id == truck_search_session_id
        )
        .order_by(LoadSnapshot.id.asc())
        .all()
    )
    results = [
        calculate_score_for_snapshot(
            db=db,
            load_snapshot_id=snapshot.id,
            current_user=current_user,
        )
        for snapshot in snapshots
    ]

    return sorted(results, key=lambda result: result.score, reverse=True)


def get_score_for_snapshot(
    db: Session,
    *,
    load_snapshot_id: int,
    current_user: User,
) -> ScoringResult:
    """
    Return the score for one snapshot, recalculating with current preferences.
    """

    return calculate_score_for_snapshot(
        db=db,
        load_snapshot_id=load_snapshot_id,
        current_user=current_user,
    )


def get_existing_scores_for_session(
    db: Session,
    *,
    truck_search_session_id: int,
    current_user: User,
) -> dict[int, ScoringResult]:
    """
    Return existing scores keyed by load_snapshot_id for lightweight load views.
    """

    results = (
        db.query(ScoringResult)
        .filter(
            ScoringResult.truck_search_session_id == truck_search_session_id,
            ScoringResult.dispatcher_user_id == current_user.id,
        )
        .all()
    )

    return {result.load_snapshot_id: result for result in results}
