"""
Rule-based scoring API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.load_snapshot import LoadSnapshot
from app.models.ai_explanation import AIExplanation
from app.models.scoring_result import ScoringResult
from app.models.user import User
from app.schemas.ai import AIExplanationResponse
from app.schemas.scoring import (
    ScoringPreferenceResponse,
    ScoringPreferenceUpdate,
    ScoringResultResponse,
    ScoringResultWithLoadSnapshotResponse,
)
from app.services.ai_explanation_service import (
    AIExplanationService,
    MIN_EXPLANATION_TEXT_LENGTH,
)
from app.services.membership_service import require_company_member
from app.services.search_service import get_truck_search_session
from app.services.scoring_service import (
    calculate_scores_for_truck_search_session,
    get_or_create_preferences,
    get_score_for_snapshot,
    update_preferences,
)


router = APIRouter(
    tags=["Scoring"],
)


@router.get(
    "/companies/{company_id}/scoring-preferences/me",
    response_model=ScoringPreferenceResponse,
)
def get_my_scoring_preferences_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get or create current dispatcher's scoring preferences.
    """

    return get_or_create_preferences(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )


@router.patch(
    "/companies/{company_id}/scoring-preferences/me",
    response_model=ScoringPreferenceResponse,
)
def update_my_scoring_preferences_endpoint(
    company_id: int,
    data: ScoringPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update current dispatcher's scoring preferences.
    """

    return update_preferences(
        db=db,
        company_id=company_id,
        current_user=current_user,
        data=data,
    )


@router.get(
    "/load-snapshots/{load_snapshot_id}/score",
    response_model=ScoringResultResponse,
)
def get_load_snapshot_score_endpoint(
    load_snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return current dispatcher's score for one load snapshot.
    """

    return get_score_for_snapshot(
        db=db,
        load_snapshot_id=load_snapshot_id,
        current_user=current_user,
    )


@router.get(
    "/truck-search-sessions/{truck_search_session_id}/score",
    response_model=list[ScoringResultResponse],
)
def score_truck_search_session_endpoint(
    truck_search_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate and return ranked load scores for one truck search session.
    """

    return calculate_scores_for_truck_search_session(
        db=db,
        truck_search_session_id=truck_search_session_id,
        current_user=current_user,
    )


@router.get(
    "/truck-search-sessions/{truck_search_session_id}/scores",
    response_model=list[ScoringResultWithLoadSnapshotResponse],
)
def list_truck_search_session_scores_endpoint(
    truck_search_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return ranked scored loads with nested load snapshot summaries.
    """

    calculate_scores_for_truck_search_session(
        db=db,
        truck_search_session_id=truck_search_session_id,
        current_user=current_user,
    )

    results = (
        db.query(ScoringResult)
        .options(
            joinedload(ScoringResult.load_snapshot).joinedload(LoadSnapshot.load),
            joinedload(ScoringResult.load_snapshot).selectinload(LoadSnapshot.sources),
        )
        .filter(
            ScoringResult.truck_search_session_id == truck_search_session_id,
            ScoringResult.dispatcher_user_id == current_user.id,
        )
        .order_by(ScoringResult.score.desc(), ScoringResult.id.asc())
        .all()
    )

    return [
        serialize_scoring_result_with_snapshot(result)
        for result in results
    ]


def serialize_scoring_result_with_snapshot(result: ScoringResult) -> dict:
    snapshot = result.load_snapshot
    load = snapshot.load
    source = snapshot.sources[0] if snapshot.sources else None
    raw_data = snapshot.raw_payload or {}

    return {
        "id": result.id,
        "company_id": result.company_id,
        "dispatcher_user_id": result.dispatcher_user_id,
        "load_snapshot_id": result.load_snapshot_id,
        "load_id": result.load_id,
        "truck_search_session_id": result.truck_search_session_id,
        "score": result.score,
        "breakdown": result.breakdown,
        "created_at": result.created_at,
        "updated_at": result.updated_at,
        "load_snapshot": {
            "id": snapshot.id,
            "load_id": snapshot.load_id,
            "source": source.load_board_name if source else None,
            "broker": load.broker_name,
            "origin": format_location(load.origin_city, load.origin_state),
            "destination": format_location(load.destination_city, load.destination_state),
            "pickup_date": snapshot.pickup_date or load.pickup_date,
            "delivery_date": snapshot.delivery_date or load.delivery_date,
            "posted_rate": snapshot.posted_rate,
            "miles": snapshot.miles,
            "rpm": calculate_rpm(snapshot.posted_rate, snapshot.miles),
            "deadhead_miles": get_optional_int_from_raw(raw_data, "deadhead_miles", "deadhead"),
            "weight": snapshot.weight,
            "equipment_type": load.equipment_type,
            "raw_data": raw_data,
        },
    }


def format_location(city: str | None, state: str | None) -> str | None:
    parts = [part for part in [city, state] if part]
    return ", ".join(parts) if parts else None


def calculate_rpm(posted_rate: float | None, miles: int | None) -> float | None:
    if posted_rate is None or not miles:
        return None

    return round(posted_rate / miles, 2)


def get_optional_int_from_raw(raw_data: dict, *keys: str) -> int | None:
    for key in keys:
        value = raw_data.get(key)
        if value is not None:
            return int(value)

    return None


def get_ranked_existing_scores_for_session(
    db: Session,
    *,
    truck_search_session_id: int,
    current_user: User,
) -> list[ScoringResult]:
    """
    Return existing scoring rows for a session sorted by score descending.
    """

    session = get_truck_search_session(
        db=db,
        truck_search_session_id=truck_search_session_id,
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

    return (
        db.query(ScoringResult)
        .filter(
            ScoringResult.truck_search_session_id == truck_search_session_id,
            ScoringResult.dispatcher_user_id == current_user.id,
        )
        .order_by(ScoringResult.score.desc(), ScoringResult.id.asc())
        .all()
    )


@router.post(
    "/truck-search-sessions/{truck_search_session_id}/ai-explanations",
    response_model=list[AIExplanationResponse],
)
def generate_truck_search_session_ai_explanations_endpoint(
    truck_search_session_id: int,
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate or reuse AI explanations for the top existing scored loads.
    """

    ranked_scores = get_ranked_existing_scores_for_session(
        db=db,
        truck_search_session_id=truck_search_session_id,
        current_user=current_user,
    )
    top_scores = ranked_scores[:limit]
    explanations = AIExplanationService().generate_for_top_loads(
        db=db,
        scoring_results=top_scores,
        limit=limit,
    )

    return [
        explanations[result.load_snapshot_id]
        for result in top_scores
        if result.load_snapshot_id in explanations
    ]


@router.get(
    "/truck-search-sessions/{truck_search_session_id}/ai-explanations",
    response_model=list[AIExplanationResponse],
)
def list_truck_search_session_ai_explanations_endpoint(
    truck_search_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return stored AI explanations for one truck search session.
    """

    ranked_scores = get_ranked_existing_scores_for_session(
        db=db,
        truck_search_session_id=truck_search_session_id,
        current_user=current_user,
    )
    score_order = {
        result.load_snapshot_id: index
        for index, result in enumerate(ranked_scores)
    }
    explanations = (
        db.query(AIExplanation)
        .filter(
            AIExplanation.truck_search_session_id == truck_search_session_id,
            AIExplanation.dispatcher_user_id == current_user.id,
            AIExplanation.explanation_text.isnot(None),
            AIExplanation.explanation_text != "",
            func.length(AIExplanation.explanation_text)
            >= MIN_EXPLANATION_TEXT_LENGTH,
        )
        .all()
    )

    return sorted(
        explanations,
        key=lambda explanation: score_order.get(
            explanation.load_snapshot_id,
            len(score_order),
        ),
    )
