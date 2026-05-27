"""
Search API endpoints.

Phase 11 endpoints create search database records and schedule mock workers.
They do not start real load-board workers or browser automation.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.search import (
    SearchBatchResponse,
    SearchStartRequest,
    TruckSearchSessionResponse,
)
from app.services.membership_service import require_company_member
from app.services.search_service import (
    cancel_truck_search_session,
    clear_truck_search_session,
    get_search_batch,
    get_truck_search_session,
    list_truck_sessions_for_batch,
    run_search_batch_workers,
    start_search_batch,
)


router = APIRouter(
    tags=["Searches"],
)


@router.post(
    "/searches/start",
    response_model=SearchBatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_search_endpoint(
    data: SearchStartRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a search batch, create truck sessions, and schedule mock workers.
    """

    batch = start_search_batch(
        db=db,
        current_user=current_user,
        data=data,
    )

    background_tasks.add_task(
        run_search_batch_workers,
        search_batch_id=batch.id,
    )

    return batch


@router.get(
    "/searches/{search_batch_id}",
    response_model=SearchBatchResponse,
)
def get_search_batch_endpoint(
    search_batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get one search batch.
    """

    batch = get_search_batch(
        db=db,
        search_batch_id=search_batch_id,
    )

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search batch not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=batch.company_id,
    )

    return batch


@router.get(
    "/searches/{search_batch_id}/truck-sessions",
    response_model=list[TruckSearchSessionResponse],
)
def list_truck_sessions_for_batch_endpoint(
    search_batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List truck search sessions for one search batch.
    """

    batch = get_search_batch(
        db=db,
        search_batch_id=search_batch_id,
    )

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search batch not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=batch.company_id,
    )

    return list_truck_sessions_for_batch(
        db=db,
        search_batch_id=search_batch_id,
    )


@router.get(
    "/truck-search-sessions/{truck_search_session_id}",
    response_model=TruckSearchSessionResponse,
)
def get_truck_search_session_endpoint(
    truck_search_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get one truck search session.
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

    return session


@router.post(
    "/truck-search-sessions/{truck_search_session_id}/cancel",
    response_model=TruckSearchSessionResponse,
)
def cancel_truck_search_session_endpoint(
    truck_search_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel one truck search session if it is not already final.
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

    return cancel_truck_search_session(
        db=db,
        session=session,
        current_user=current_user,
    )


@router.delete(
    "/truck-search-sessions/{truck_search_session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_truck_search_session_endpoint(
    truck_search_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clear a final truck search session from visible history.
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

    clear_truck_search_session(
        db=db,
        session=session,
    )

    return None
