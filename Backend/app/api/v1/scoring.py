"""
Rule-based scoring API endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.scoring import (
    ScoringPreferenceResponse,
    ScoringPreferenceUpdate,
    ScoringResultResponse,
)
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
