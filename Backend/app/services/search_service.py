"""
Search service.

Phase 11 creates search records and schedules mock workers separately.
No real load-board search workers or browser automation run here.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.search_batch import SearchBatch
from app.models.truck import Truck
from app.models.truck_search_session import TruckSearchSession
from app.models.user import User
from app.schemas.search import SearchStartRequest
from app.services.membership_service import require_company_member
from app.services.worker_log_service import create_worker_log
from app.workers.worker_manager import WorkerManager


ACTIVE_STATUSES = {"pending", "running"}
FINAL_STATUSES = {"completed", "failed", "canceled", "cancelled", "timeout"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def start_search_batch(
    db: Session,
    current_user: User,
    data: SearchStartRequest,
) -> SearchBatch:
    """
    Start a dispatcher-requested search batch.

    Phase 11 returns after creating records so WebSocket clients can observe
    background mock-worker progress.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=data.company_id,
    )

    if not data.truck_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one truck_id is required.",
        )

    trucks = (
        db.query(Truck)
        .filter(
            Truck.company_id == data.company_id,
            Truck.id.in_(data.truck_ids),
        )
        .all()
    )

    found_truck_ids = {truck.id for truck in trucks}
    missing_truck_ids = [
        truck_id
        for truck_id in data.truck_ids
        if truck_id not in found_truck_ids
    ]

    if missing_truck_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All trucks must belong to the selected company.",
        )

    validate_trucks_available_for_search(trucks)

    active_session = (
        db.query(TruckSearchSession)
        .filter(
            TruckSearchSession.company_id == data.company_id,
            TruckSearchSession.truck_id.in_(data.truck_ids),
            TruckSearchSession.status.in_(ACTIVE_STATUSES),
            TruckSearchSession.is_hidden.is_(False),
        )
        .first()
    )

    if active_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Truck already has active search",
        )

    filters_snapshot = {
        "truck_ids": data.truck_ids,
        "overrides": data.overrides or {},
    }

    batch = SearchBatch(
        company_id=data.company_id,
        created_by_user_id=current_user.id,
        status="pending",
        filters_snapshot=filters_snapshot,
        total_trucks=len(data.truck_ids),
        completed_trucks=0,
        failed_trucks=0,
        timeout_seconds=data.timeout_seconds,
    )

    db.add(batch)
    db.flush()

    trucks_by_id = {truck.id: truck for truck in trucks}

    for truck_id in data.truck_ids:
        truck_filters_snapshot = build_truck_filters_snapshot(
            truck=trucks_by_id[truck_id],
            overrides=data.overrides,
        )
        truck_session = TruckSearchSession(
            search_batch_id=batch.id,
            company_id=data.company_id,
            truck_id=truck_id,
            owner_user_id=current_user.id,
            status="pending",
            filters_snapshot=truck_filters_snapshot,
            timeout_seconds=data.timeout_seconds,
        )
        db.add(truck_session)

    db.commit()
    db.refresh(batch)

    return batch


def validate_trucks_available_for_search(trucks: list[Truck]) -> None:
    for truck in trucks:
        normalized_status = (truck.status or "").strip().lower()

        if normalized_status == "available":
            continue
        if normalized_status == "loaded":
            message = "Truck is loaded and cannot start a new search"
        elif normalized_status == "moving":
            message = "Truck is moving and cannot start a new search"
        elif normalized_status in {"service_needed", "maintenance"}:
            message = "Truck needs service and cannot start a new search"
        else:
            message = "Truck is not available for search"

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )


def build_truck_filters_snapshot(
    truck: Truck,
    overrides: dict | None = None,
) -> dict:
    """
    Generate the search filters snapshot from truck defaults plus overrides.

    Later real search execution should read from this snapshot instead of asking
    the frontend to provide a giant filter payload.
    """

    snapshot = {
        "truck_id": truck.id,
        "truck_number": truck.truck_id,
        "equipment_type": truck.equipment_type,
        "current_location": truck.current_location,
        "available_from": (
            truck.available_from.isoformat()
            if truck.available_from is not None
            else None
        ),
        "max_deadhead_miles": truck.max_deadhead_miles,
        "min_rpm": truck.min_rpm,
        "max_weight": truck.max_weight,
        "preferred_broker_sources": parse_broker_sources(
            truck.preferred_broker_sources
        ),
    }

    if overrides:
        snapshot.update(overrides)

    return snapshot


def parse_broker_sources(value: str | list[str] | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [item.strip() for item in value if item.strip()]

    return [item.strip() for item in value.split(",") if item.strip()]


def run_search_batch_workers(
    search_batch_id: int,
    delay_seconds: float = 0.2,
) -> None:
    """
    Run mock workers for a search batch in a fresh DB session.

    This is designed for FastAPI BackgroundTasks. The request-scoped DB
    session must not be passed into background execution.
    """

    db = SessionLocal()

    try:
        batch = get_search_batch(
            db=db,
            search_batch_id=search_batch_id,
        )

        if batch is None:
            return

        worker_manager = WorkerManager(
            db=db,
            delay_seconds=delay_seconds,
        )
        worker_manager.run_search_batch(batch)

    finally:
        db.close()


def get_search_batch(
    db: Session,
    search_batch_id: int,
) -> SearchBatch | None:
    """
    Return one search batch by id.
    """

    return (
        db.query(SearchBatch)
        .filter(SearchBatch.id == search_batch_id)
        .first()
    )


def list_truck_sessions_for_batch(
    db: Session,
    search_batch_id: int,
) -> list[TruckSearchSession]:
    """
    Return all truck search sessions for a batch.
    """

    return (
        db.query(TruckSearchSession)
        .filter(
            TruckSearchSession.search_batch_id == search_batch_id,
            TruckSearchSession.is_hidden.is_(False),
        )
        .order_by(TruckSearchSession.id.asc())
        .all()
    )


def get_truck_search_session(
    db: Session,
    truck_search_session_id: int,
) -> TruckSearchSession | None:
    """
    Return one truck search session by id.
    """

    return (
        db.query(TruckSearchSession)
        .filter(TruckSearchSession.id == truck_search_session_id)
        .first()
    )


def cancel_truck_search_session(
    db: Session,
    session: TruckSearchSession,
    current_user: User,
) -> TruckSearchSession:
    """
    Cancel a truck search session when it is not already final.
    """

    if session.status in FINAL_STATUSES:
        return session

    session.status = "canceled"
    session.completed_at = utc_now()

    db.add(session)
    db.commit()
    db.refresh(session)

    create_worker_log(
        db=db,
        truck_search_session_id=session.id,
        company_id=session.company_id,
        level="info",
        message="Truck search session was canceled manually.",
        source="api",
        metadata_json={"canceled_by_user_id": current_user.id},
    )

    db.refresh(session)

    return session


def clear_truck_search_session(
    db: Session,
    session: TruckSearchSession,
) -> None:
    """
    Hide a final truck search session from session lists.

    This keeps related worker logs, load snapshots, and future audit records
    intact while letting the frontend clear old completed session history.
    """

    if session.status in ACTIVE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete active search session. Cancel it first.",
        )

    session.is_hidden = True
    db.add(session)
    db.commit()
