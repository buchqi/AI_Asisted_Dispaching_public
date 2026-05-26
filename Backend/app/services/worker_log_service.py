"""
Worker log service.

Phase 8 stores future worker/mock-provider/debug logs only.
Real workers and streaming will be added in later phases.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.models.worker_log import WorkerLog


def create_worker_log(
    db: Session,
    truck_search_session_id: int,
    company_id: int,
    level: str,
    message: str,
    source: str | None = None,
    metadata_json: dict[str, Any] | None = None,
) -> WorkerLog:
    """
    Create one worker log row for a truck search session.
    """

    log = WorkerLog(
        truck_search_session_id=truck_search_session_id,
        company_id=company_id,
        level=level,
        message=message,
        source=source,
        metadata_json=metadata_json,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log


def list_worker_logs_for_truck_session(
    db: Session,
    truck_search_session_id: int,
) -> list[WorkerLog]:
    """
    Return logs for one truck search session in creation order.
    """

    return (
        db.query(WorkerLog)
        .filter(WorkerLog.truck_search_session_id == truck_search_session_id)
        .order_by(WorkerLog.created_at.asc())
        .all()
    )
