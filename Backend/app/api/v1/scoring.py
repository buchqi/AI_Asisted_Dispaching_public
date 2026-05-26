"""
Rule-based scoring API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.ai_explanation import AIExplanation
from app.models.scoring_result import ScoringResult
from app.models.user import User
from app.schemas.ai import AIExplanationResponse
from app.schemas.scoring import (
    ScoringPreferenceResponse,
    ScoringPreferenceUpdate,
    ScoringResultResponse,
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
