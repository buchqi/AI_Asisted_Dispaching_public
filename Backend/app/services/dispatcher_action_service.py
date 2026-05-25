"""
Dispatcher action service.

Dispatchers can act only on loads from truck search sessions they own.
Every action is stored as history instead of overwriting prior actions.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

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


def get_action_state_for_session_loads(
    db: Session,
    *,
    truck_search_session_id: int,
) -> dict[int, dict[str, bool]]:
    """
    Return action-state booleans keyed by load_id for one truck search.
    """

    actions = (
        db.query(DispatcherAction)
        .filter(
            DispatcherAction.truck_search_session_id
            == truck_search_session_id
        )
        .all()
    )
    state: dict[int, dict[str, bool]] = {}

    for action in actions:
        load_state = state.setdefault(
            action.load_id,
            {
                "saved": False,
                "rejected": False,
                "favorite": False,
                "contacted": False,
            },
        )

        if action.action_type == "save":
            load_state["saved"] = True
        elif action.action_type == "reject":
            load_state["rejected"] = True
        elif action.action_type == "favorite":
            load_state["favorite"] = True
        elif action.action_type == "contacted":
            load_state["contacted"] = True

    return state
