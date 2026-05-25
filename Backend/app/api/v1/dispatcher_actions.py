"""
Dispatcher action API endpoints.

These endpoints let the owner dispatcher act on loads produced by their
truck search session.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dispatcher_action import DispatcherActionResponse
from app.services.dispatcher_action_service import create_dispatcher_action


router = APIRouter(
    tags=["Dispatcher Actions"],
)


@router.post(
    "/truck-search-sessions/{truck_search_session_id}/loads/{load_id}/save",
    response_model=DispatcherActionResponse,
)
def save_load_endpoint(
    truck_search_session_id: int,
    load_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save a load result for the owner dispatcher.
    """

    return create_dispatcher_action(
        db=db,
        truck_search_session_id=truck_search_session_id,
        load_id=load_id,
        action_type="save",
        current_user=current_user,
    )


@router.post(
    "/truck-search-sessions/{truck_search_session_id}/loads/{load_id}/reject",
    response_model=DispatcherActionResponse,
)
def reject_load_endpoint(
    truck_search_session_id: int,
    load_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject a load result for the owner dispatcher.
    """

    return create_dispatcher_action(
        db=db,
        truck_search_session_id=truck_search_session_id,
        load_id=load_id,
        action_type="reject",
        current_user=current_user,
    )


@router.post(
    "/truck-search-sessions/{truck_search_session_id}/loads/{load_id}/favorite",
    response_model=DispatcherActionResponse,
)
def favorite_load_endpoint(
    truck_search_session_id: int,
    load_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Favorite a load result for the owner dispatcher.
    """

    return create_dispatcher_action(
        db=db,
        truck_search_session_id=truck_search_session_id,
        load_id=load_id,
        action_type="favorite",
        current_user=current_user,
    )


@router.post(
    "/truck-search-sessions/{truck_search_session_id}/loads/{load_id}/contacted",
    response_model=DispatcherActionResponse,
)
def mark_load_contacted_endpoint(
    truck_search_session_id: int,
    load_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a load result as contacted for the owner dispatcher.
    """

    return create_dispatcher_action(
        db=db,
        truck_search_session_id=truck_search_session_id,
        load_id=load_id,
        action_type="contacted",
        current_user=current_user,
    )
