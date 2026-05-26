"""
Worker manager.

The MVP manager is intentionally simple and synchronous.
It starts mock workers for search sessions now, while keeping the call site
easy to replace with real background workers in later phases.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.search_batch import SearchBatch
from app.models.truck_search_session import TruckSearchSession
from app.websockets.connection_manager import manager
from app.websockets.events import create_ws_event
from app.workers.mock_search_worker import MockSearchWorker


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class WorkerManager:
    """
    Starts mock workers for all truck sessions in a search batch.

    No Celery, Redis, or browser automation is used in Phase 11.
    Progress is broadcast through the in-memory WebSocket manager.
    """

    def __init__(
        self,
        db: Session,
        delay_seconds: float = 0,
        worker_class: type[MockSearchWorker] = MockSearchWorker,
    ):
        self.db = db
        self.delay_seconds = delay_seconds
        self.worker_class = worker_class

    def run_search_batch(self, batch: SearchBatch) -> SearchBatch:
        """
        Run one mock worker for each truck search session in a batch.
        """

        batch.status = "running"

        if batch.started_at is None:
            batch.started_at = utc_now()

        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)

        self._broadcast(
            event_type="search.started",
            batch=batch,
            message="Search batch started.",
            data={"total_trucks": batch.total_trucks},
        )

        sessions = (
            self.db.query(TruckSearchSession)
            .filter(TruckSearchSession.search_batch_id == batch.id)
            .order_by(TruckSearchSession.id.asc())
            .all()
        )

        for session in sessions:
            worker = self.worker_class(
                db=self.db,
                truck_search_session_id=session.id,
                delay_seconds=self.delay_seconds,
            )
            worker.run()

        completed_count = (
            self.db.query(TruckSearchSession)
            .filter(
                TruckSearchSession.search_batch_id == batch.id,
                TruckSearchSession.status == "completed",
            )
            .count()
        )
        failed_count = (
            self.db.query(TruckSearchSession)
            .filter(
                TruckSearchSession.search_batch_id == batch.id,
                TruckSearchSession.status == "failed",
            )
            .count()
        )

        batch.completed_trucks = completed_count
        batch.failed_trucks = failed_count
        batch.completed_at = utc_now()

        if failed_count:
            batch.status = "failed"
        else:
            batch.status = "completed"

        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)

        if batch.status == "failed":
            self._broadcast(
                event_type="search.failed",
                batch=batch,
                message="Search batch failed.",
                data={
                    "completed_trucks": batch.completed_trucks,
                    "failed_trucks": batch.failed_trucks,
                },
            )
        else:
            self._broadcast(
                event_type="search.completed",
                batch=batch,
                message="Search batch completed.",
                data={
                    "completed_trucks": batch.completed_trucks,
                    "failed_trucks": batch.failed_trucks,
                },
            )

        return batch

    def _broadcast(
        self,
        *,
        event_type: str,
        batch: SearchBatch,
        message: str,
        data: dict | None = None,
    ) -> None:
        event = create_ws_event(
            event_type=event_type,
            company_id=batch.company_id,
            search_batch_id=batch.id,
            message=message,
            data=data,
        )

        manager.broadcast_to_company_sync(
            company_id=batch.company_id,
            event=event,
        )
        manager.broadcast_to_search_sync(
            search_batch_id=batch.id,
            event=event,
        )
