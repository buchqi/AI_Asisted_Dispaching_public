"""
Load result API endpoints.

Phase 10 exposes stored mock-search load results.
No scoring, booking, WebSockets, or real browser automation is implemented.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.load import LoadResponse, LoadSnapshotResponse
from app.services.dispatcher_action_service import (
    get_action_state_for_session_loads,
)
from app.services.load_service import (
    get_load_by_id,
    get_load_snapshot_by_id,
    list_loads_for_truck_search_session,
)
from app.services.membership_service import require_company_member
from app.services.search_service import get_truck_search_session
from app.services.scoring_service import get_existing_scores_for_session


router = APIRouter(
    tags=["Loads"],
)


@router.get(
    "/truck-search-sessions/{truck_search_session_id}/loads",
    response_model=list[LoadSnapshotResponse],
)
def list_truck_search_session_loads_endpoint(
    truck_search_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return load snapshots produced for one truck search session.
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

    snapshots = list_loads_for_truck_search_session(
        db=db,
        truck_search_session_id=truck_search_session_id,
    )
    action_state = get_action_state_for_session_loads(
        db=db,
        truck_search_session_id=truck_search_session_id,
    )
    scores = get_existing_scores_for_session(
        db=db,
        truck_search_session_id=truck_search_session_id,
        current_user=current_user,
    )

    for snapshot in snapshots:
        snapshot.action_state = action_state.get(
            snapshot.load_id,
            {
                "saved": False,
                "rejected": False,
                "favorite": False,
                "contacted": False,
            },
        )
        score = scores.get(snapshot.id)

        if score is not None:
            snapshot.score = score.score
            snapshot.score_breakdown = score.breakdown

    return snapshots


@router.get(
    "/loads/{load_id}",
    response_model=LoadResponse,
)
def get_load_endpoint(
    load_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return one stable deduplicated Load record.
    """

    load = get_load_by_id(
        db=db,
        load_id=load_id,
    )

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=load.company_id,
    )

    return load


@router.get(
    "/load-snapshots/{load_snapshot_id}",
    response_model=LoadSnapshotResponse,
)
def get_load_snapshot_endpoint(
    load_snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return one search-time load snapshot.
    """

    snapshot = get_load_snapshot_by_id(
        db=db,
        load_snapshot_id=load_snapshot_id,
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

    return snapshot
