"""
WebSocket API endpoints.

Phase 11 streams live mock-search progress to authenticated company members.
No frontend, Redis pub/sub, Celery, or real browser automation is implemented.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import SessionLocal
from app.models.user import User
from app.services.membership_service import require_company_member
from app.services.search_service import get_search_batch
from app.websockets.connection_manager import manager


router = APIRouter(
    tags=["WebSockets"],
)


def get_websocket_user(
    db: Session,
    token: str | None,
) -> User | None:
    """
    Authenticate a WebSocket query-token using the normal JWT utilities.
    """

    if not token:
        return None

    payload = decode_access_token(token)

    if not payload:
        return None

    user_id = payload.get("sub")

    if not user_id:
        return None

    user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .first()
    )

    if not user or not user.is_active:
        return None

    return user


@router.websocket("/ws/companies/{company_id}")
async def company_progress_websocket(
    websocket: WebSocket,
    company_id: int,
):
    """
    Company-wide progress stream.

    Test with:
    ws://127.0.0.1:8000/ws/companies/{company_id}?token=TOKEN
    """

    db = SessionLocal()
    user = get_websocket_user(
        db=db,
        token=websocket.query_params.get("token"),
    )

    try:
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        require_company_member(
            db=db,
            current_user=user,
            company_id=company_id,
        )
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    finally:
        db.close()

    await manager.connect_company(
        company_id=company_id,
        websocket=websocket,
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_company(
            company_id=company_id,
            websocket=websocket,
        )


@router.websocket("/ws/searches/{search_batch_id}")
async def search_progress_websocket(
    websocket: WebSocket,
    search_batch_id: int,
):
    """
    Search-specific progress stream.

    Test with:
    ws://127.0.0.1:8000/ws/searches/{search_batch_id}?token=TOKEN
    """

    db = SessionLocal()
    user = get_websocket_user(
        db=db,
        token=websocket.query_params.get("token"),
    )

    try:
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        batch = get_search_batch(
            db=db,
            search_batch_id=search_batch_id,
        )

        if not batch:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        require_company_member(
            db=db,
            current_user=user,
            company_id=batch.company_id,
        )
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    finally:
        db.close()

    await manager.connect_search(
        search_batch_id=search_batch_id,
        websocket=websocket,
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_search(
            search_batch_id=search_batch_id,
            websocket=websocket,
        )
