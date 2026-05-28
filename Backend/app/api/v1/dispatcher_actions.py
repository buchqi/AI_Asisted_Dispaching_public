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
from app.services.dispatcher_action_service import (
    create_dispatcher_action,
    list_live_load_actions,
)
from app.services.membership_service import require_company_member


router = APIRouter(
    tags=["Dispatcher Actions"],
)


@router.get("/companies/{company_id}/dispatcher-action-loads")
def list_dispatcher_action_loads_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return current dispatcher's latest saved/contacted loads.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    actions = list_live_load_actions(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )

    return [serialize_live_load_action(action) for action in actions]


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


@router.post(
    "/truck-search-sessions/{truck_search_session_id}/loads/{load_id}/clear-action",
    response_model=DispatcherActionResponse,
)
def clear_load_action_endpoint(
    truck_search_session_id: int,
    load_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clear the active load action by appending a history row.
    """

    return create_dispatcher_action(
        db=db,
        truck_search_session_id=truck_search_session_id,
        load_id=load_id,
        action_type="cleared",
        current_user=current_user,
    )


def serialize_live_load_action(action):
    snapshot = action.load_snapshot
    load = action.load
    source = snapshot.sources[0] if snapshot and snapshot.sources else None
    raw_data = snapshot.raw_payload or {}

    return {
        "dispatcher_action_id": action.id,
        "action_type": action.action_type,
        "created_at": action.created_at,
        "truck_search_session_id": action.truck_search_session_id,
        "load_id": action.load_id,
        "load_snapshot_id": action.load_snapshot_id,
        "load": {
            "id": load.id,
            "broker_name": load.broker_name,
            "equipment_type": load.equipment_type,
            "origin_city": load.origin_city,
            "origin_state": load.origin_state,
            "destination_city": load.destination_city,
            "destination_state": load.destination_state,
            "pickup_date": load.pickup_date,
            "delivery_date": load.delivery_date,
        },
        "load_snapshot": {
            "id": snapshot.id,
            "posted_rate": snapshot.posted_rate,
            "miles": snapshot.miles,
            "weight": snapshot.weight,
            "pickup_date": snapshot.pickup_date,
            "delivery_date": snapshot.delivery_date,
            "raw_payload": raw_data,
        },
        "source": {
            "load_board_name": source.load_board_name if source else None,
            "contact_phone": source.contact_phone if source else None,
        },
    }
