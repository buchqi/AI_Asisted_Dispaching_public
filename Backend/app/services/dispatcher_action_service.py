"""
Dispatcher action service.

Dispatchers can act only on loads from truck search sessions they own.
Every action is stored as history instead of overwriting prior actions.
"""

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import require_truck_search_session_owner
from app.models.dispatcher_action import DispatcherAction
from app.models.load import Load
from app.models.load_snapshot import LoadSnapshot
from app.models.user import User


VALID_ACTION_TYPES = {
    "save",
    "reject",
    "favorite",
    "contacted",
    "cleared",
}

LIVE_LOAD_ACTION_TYPES = {
    "save",
    "contacted",
}


def get_session_load_snapshot(
    db: Session,
    *,
    truck_search_session_id: int,
    load_id: int,
) -> LoadSnapshot:
    """
    Return the load snapshot proving the load belongs to the search session.
    """

    snapshot = (
        db.query(LoadSnapshot)
        .filter(
            LoadSnapshot.truck_search_session_id == truck_search_session_id,
            LoadSnapshot.load_id == load_id,
        )
        .order_by(LoadSnapshot.id.desc())
        .first()
    )

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load was not found in this truck search session.",
        )

    return snapshot


def create_dispatcher_action(
    db: Session,
    *,
    truck_search_session_id: int,
    load_id: int,
    action_type: str,
    current_user: User,
) -> DispatcherAction:
    """
    Store one dispatcher action for a load result.
    """

    if action_type not in VALID_ACTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported dispatcher action.",
        )

    session = require_truck_search_session_owner(
        db=db,
        current_user=current_user,
        truck_search_session_id=truck_search_session_id,
    )

    load = (
        db.query(Load)
        .filter(
            Load.id == load_id,
            Load.company_id == session.company_id,
        )
        .first()
    )

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load not found.",
        )

    snapshot = get_session_load_snapshot(
        db=db,
        truck_search_session_id=truck_search_session_id,
        load_id=load_id,
    )

    action = DispatcherAction(
        company_id=session.company_id,
        truck_search_session_id=session.id,
        load_id=load.id,
        load_snapshot_id=snapshot.id,
        dispatcher_user_id=current_user.id,
        action_type=action_type,
    )

    db.add(action)
    db.commit()
    db.refresh(action)

    return action


def list_live_load_actions(
    db: Session,
    *,
    company_id: int,
    current_user: User,
) -> list[DispatcherAction]:
    """
    Return latest saved/contacted dispatcher actions for the work queue.
    """

    latest_action_ids = (
        db.query(func.max(DispatcherAction.id).label("id"))
        .filter(
            DispatcherAction.company_id == company_id,
            DispatcherAction.dispatcher_user_id == current_user.id,
        )
        .group_by(
            DispatcherAction.truck_search_session_id,
            DispatcherAction.load_id,
        )
        .subquery()
    )

    return (
        db.query(DispatcherAction)
        .options(
            joinedload(DispatcherAction.load),
            joinedload(DispatcherAction.load_snapshot).selectinload(
                LoadSnapshot.sources
            ),
        )
        .join(
            latest_action_ids,
            DispatcherAction.id == latest_action_ids.c.id,
        )
        .filter(DispatcherAction.action_type.in_(LIVE_LOAD_ACTION_TYPES))
        .order_by(DispatcherAction.created_at.desc(), DispatcherAction.id.desc())
        .all()
    )


def get_action_state_for_session_loads(
    db: Session,
    *,
    truck_search_session_id: int,
) -> dict[int, dict[str, Any]]:
    """
    Return latest action state keyed by load_id for one truck search.
    """

    actions = (
        db.query(DispatcherAction)
        .filter(
            DispatcherAction.truck_search_session_id
            == truck_search_session_id
        )
        .order_by(
            DispatcherAction.created_at.asc(),
            DispatcherAction.id.asc(),
        )
        .all()
    )
    state: dict[int, dict[str, Any]] = {}

    for action in actions:
        state[action.load_id] = build_action_state(action.action_type)

    return state


def build_action_state(action_type: str | None) -> dict[str, bool | str | None]:
    """
    Convert the latest action row into one active UI action.
    """

    active_action = action_type if action_type in VALID_ACTION_TYPES else None
    if active_action == "cleared":
        active_action = None

    return {
        "saved": active_action == "save",
        "rejected": active_action == "reject",
        "favorite": active_action == "favorite",
        "contacted": active_action == "contacted",
        "latest_action_type": action_type,
        "active_action_type": active_action,
    }
