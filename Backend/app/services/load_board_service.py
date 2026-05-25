"""
Load-board session service layer.

Responsibilities:
- Create session records
- Retrieve company sessions
- Update session metadata
- Store health-check results
- Mark sessions expired

This service does not:
- authenticate against load boards
- launch browsers
- manage cookies or tokens

Those responsibilities will be introduced later during
the real browser automation phase.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.load_board_session import LoadBoardSession
from app.schemas.load_board import (
    LoadBoardSessionCreate,
    LoadBoardSessionHealthCheck,
    LoadBoardSessionUpdate,
)


def utc_now() -> datetime:
    """Return the current UTC datetime for timestamp fields."""
    return datetime.now(timezone.utc)


def create_load_board_session(
    db: Session,
    *,
    company_id: int,
    data: LoadBoardSessionCreate,
) -> LoadBoardSession:
    """
    Create a company-level load-board session record.

    MVP scope:
    - Stores metadata only.
    - Does not perform login.
    - Does not store cookies/tokens.
    - Real browser session management will be added later.

    Newly created sessions start in:
    - status = "pending"
    - health_status = "unknown"
    """

    session = LoadBoardSession(
        company_id=company_id,
        board_name=data.board_name,
        session_label=data.session_label,
        username_or_email=data.username_or_email,
        status="pending",
        health_status="unknown",
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def list_company_load_board_sessions(
    db: Session,
    *,
    company_id: int,
) -> list[LoadBoardSession]:
    """
    Return all load-board session records belonging to a company.

    Results are ordered by newest first to make future admin/session
    management screens easier to display.
    """

    return (
        db.query(LoadBoardSession)
        .filter(LoadBoardSession.company_id == company_id)
        .order_by(LoadBoardSession.created_at.desc())
        .all()
    )


def get_load_board_session(
    db: Session,
    *,
    session_id: int,
) -> LoadBoardSession | None:
    """
    Retrieve a single load-board session by id.

    Returns None when the session does not exist.
    """

    return (
        db.query(LoadBoardSession)
        .filter(LoadBoardSession.id == session_id)
        .first()
    )


def update_load_board_session(
    db: Session,
    *,
    session: LoadBoardSession,
    data: LoadBoardSessionUpdate,
) -> LoadBoardSession:
    """
    Apply partial updates to an existing load-board session.

    Only fields explicitly provided in the request body are modified.
    Missing fields are ignored and keep their current database values.
    """

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(session, field, value)

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def check_load_board_session_health(
    db: Session,
    *,
    session: LoadBoardSession,
    data: LoadBoardSessionHealthCheck,
) -> LoadBoardSession:
    """
    Store the result of a load-board session health check.

    Current MVP behavior:
    - healthy   -> session status becomes active
    - unhealthy -> session status becomes error
    - warning   -> session status remains active

    Later, this function can be connected to real browser/session checks.
    """

    session.health_status = data.health_status
    session.health_message = data.health_message
    session.debug_notes = data.debug_notes
    session.last_health_check_at = utc_now()

    if data.health_status == "healthy":
        session.status = "active"
    elif data.health_status == "unhealthy":
        session.status = "error"
    elif data.health_status == "warning":
        session.status = "active"

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def mark_load_board_session_expired(
    db: Session,
    *,
    session: LoadBoardSession,
    message: str | None = None,
) -> LoadBoardSession:
    """
    Mark a load-board session as expired.

    Used when:
    - credentials are no longer valid
    - session lifetime has elapsed
    - external login requires re-authentication
    """

    session.status = "expired"
    session.health_status = "unhealthy"
    session.health_message = message or "Load-board session is expired."
    session.last_health_check_at = utc_now()

    db.add(session)
    db.commit()
    db.refresh(session)

    return session