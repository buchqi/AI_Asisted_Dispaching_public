"""
Mock search worker.

This worker simulates future load-board automation for the MVP.
It does not use browsers, scrape websites, or connect to real load boards.
Real automation will replace this logic in later phases.
"""

from datetime import date, datetime, timedelta, timezone
from random import Random
from time import sleep
from typing import Any

from sqlalchemy.orm import Session

from app.models.load_board_session import LoadBoardSession
from app.models.truck_search_session import TruckSearchSession
from app.services.load_service import store_raw_load_results
from app.services.worker_log_service import create_worker_log
from app.websockets.connection_manager import manager
from app.websockets.events import create_ws_event


DEFAULT_MOCK_BOARDS = ["DAT", "TruckStop", "123Loadboard"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MockSearchWorker:
    """
    Synchronous mock worker for one truck search session.

    It simulates the lifecycle that future browser automation will follow:
    pending -> running -> completed, with worker logs along the way.
    WebSockets and streaming progress are intentionally not implemented yet.
    """

    def __init__(
        self,
        db: Session,
        truck_search_session_id: int,
        delay_seconds: float = 0,
    ):
        self.db = db
        self.truck_search_session_id = truck_search_session_id
        self.delay_seconds = delay_seconds

    def run(self) -> bool:
        """
        Run the mock worker.

        Returns True when the session completes and False when it fails.
        """

        session = self._load_session()

        try:
            self._mark_running(session)

            boards = self._load_board_names(session.company_id)
            create_worker_log(
                db=self.db,
                truck_search_session_id=session.id,
                company_id=session.company_id,
                level="info",
                message="Connected to mock load boards.",
                source="mock_search_worker",
                metadata_json={
                    "event": "load_board.connected",
                    "boards": boards,
                },
            )
            self._broadcast(
                event_type="load_board.connected",
                session=session,
                message="Connected to mock load boards.",
                data={"boards": boards},
            )

            self._delay()

            mock_loads = self._generate_mock_loads(
                session=session,
                boards=boards,
            )
            snapshots = store_raw_load_results(
                db=self.db,
                company_id=session.company_id,
                truck_search_session_id=session.id,
                raw_loads=mock_loads,
            )
            create_worker_log(
                db=self.db,
                truck_search_session_id=session.id,
                company_id=session.company_id,
                level="info",
                message="Mock loads generated and stored.",
                source="mock_search_worker",
                metadata_json={
                    "event": "loads.found",
                    "count": len(snapshots),
                    "load_snapshot_ids": [
                        snapshot.id
                        for snapshot in snapshots
                    ],
                },
            )
            self._broadcast(
                event_type="loads.found",
                session=session,
                message="Mock loads generated and stored.",
                data={
                    "count": len(snapshots),
                    "load_snapshot_ids": [
                        snapshot.id
                        for snapshot in snapshots
                    ],
                },
            )

            self._mark_completed(session)
            return True

        except Exception as exc:
            self._mark_failed(session=session, error=exc)
            return False

    def _load_session(self) -> TruckSearchSession:
        session = (
            self.db.query(TruckSearchSession)
            .filter(TruckSearchSession.id == self.truck_search_session_id)
            .first()
        )

        if session is None:
            raise ValueError("Truck search session not found.")

        return session

    def _mark_running(self, session: TruckSearchSession) -> None:
        session.status = "running"

        if session.started_at is None:
            session.started_at = utc_now()

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        create_worker_log(
            db=self.db,
            truck_search_session_id=session.id,
            company_id=session.company_id,
            level="info",
            message="Mock worker started.",
            source="mock_search_worker",
            metadata_json={"event": "worker.started"},
        )
        self._broadcast(
            event_type="worker.started",
            session=session,
            message="Mock worker started.",
        )

    def _mark_completed(self, session: TruckSearchSession) -> None:
        session.status = "completed"
        session.completed_at = utc_now()

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        create_worker_log(
            db=self.db,
            truck_search_session_id=session.id,
            company_id=session.company_id,
            level="info",
            message="Mock worker completed.",
            source="mock_search_worker",
            metadata_json={"event": "worker.completed"},
        )
        self._broadcast(
            event_type="worker.completed",
            session=session,
            message="Mock worker completed.",
        )

    def _mark_failed(
        self,
        session: TruckSearchSession,
        error: Exception,
    ) -> None:
        session.status = "failed"
        session.error_message = str(error)
        session.completed_at = utc_now()

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        create_worker_log(
            db=self.db,
            truck_search_session_id=session.id,
            company_id=session.company_id,
            level="error",
            message="Mock worker failed.",
            source="mock_search_worker",
            metadata_json={
                "event": "worker.failed",
                "error": str(error),
            },
        )
        self._broadcast(
            event_type="worker.failed",
            session=session,
            message="Mock worker failed.",
            data={"error": str(error)},
        )

    def _load_board_names(self, company_id: int) -> list[str]:
        board_names = [
            board_name
            for (board_name,) in (
                self.db.query(LoadBoardSession.board_name)
                .filter(
                    LoadBoardSession.company_id == company_id,
                    LoadBoardSession.status == "active",
                )
                .all()
            )
        ]

        return board_names or DEFAULT_MOCK_BOARDS

    def _delay(self) -> None:
        if self.delay_seconds > 0:
            sleep(min(self.delay_seconds, 0.3))

    def _generate_mock_loads(
        self,
        session: TruckSearchSession,
        boards: list[str],
    ) -> list[dict[str, Any]]:
        """
        Generate realistic mock load data.

        Phase 10 stores these generated loads as Load, LoadSnapshot, and
        LoadSource records through LoadService.
        """

        random = Random(session.id)
        today = date.today()
        lanes = [
            ("Dallas", "TX", "Atlanta", "GA"),
            ("Chicago", "IL", "Nashville", "TN"),
            ("Phoenix", "AZ", "Denver", "CO"),
            ("Charlotte", "NC", "Columbus", "OH"),
            ("Kansas City", "MO", "Minneapolis", "MN"),
            ("Savannah", "GA", "Orlando", "FL"),
        ]
        brokers = [
            "Summit Freight",
            "BlueLine Logistics",
            "Atlas Brokerage",
            "Northstar Transport",
            "Pioneer Freight Group",
        ]
        equipment_type = "Dry Van"

        if session.filters_snapshot:
            equipment_type = (
                session.filters_snapshot.get("equipment_type")
                or session.filters_snapshot.get("equipment")
                or equipment_type
            )

        loads = []

        for index in range(5):
            origin_city, origin_state, dest_city, dest_state = lanes[
                random.randrange(len(lanes))
            ]
            pickup_date = today + timedelta(days=random.randint(1, 3))
            delivery_date = pickup_date + timedelta(days=random.randint(1, 4))
            miles = random.randint(350, 1750)
            rate = miles * random.randint(2, 4) + random.randint(250, 900)
            board = boards[index % len(boards)]

            loads.append(
                {
                    "origin_city": origin_city,
                    "origin_state": origin_state,
                    "destination_city": dest_city,
                    "destination_state": dest_state,
                    "pickup_date": pickup_date.isoformat(),
                    "delivery_date": delivery_date.isoformat(),
                    "equipment_type": equipment_type,
                    "rate": rate,
                    "miles": miles,
                    "weight": random.randint(12000, 43000),
                    "broker_name": brokers[random.randrange(len(brokers))],
                    "load_board_name": board,
                    "external_load_id": (
                        f"{board.upper().replace(' ', '')}-"
                        f"{session.id}-{index + 1:03d}"
                    ),
                    "source_url": (
                        "https://mock-load-board.local/"
                        f"{session.id}/{index + 1}"
                    ),
                    "contact_phone": f"555-01{random.randint(10, 99)}",
                    "contact_email": "dispatch@example.com",
                }
            )

        return loads

    def _broadcast(
        self,
        *,
        event_type: str,
        session: TruckSearchSession,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        event = create_ws_event(
            event_type=event_type,
            company_id=session.company_id,
            search_batch_id=session.search_batch_id,
            truck_search_session_id=session.id,
            message=message,
            data=data,
        )

        manager.broadcast_to_company_sync(
            company_id=session.company_id,
            event=event,
        )
        manager.broadcast_to_search_sync(
            search_batch_id=session.search_batch_id,
            event=event,
        )
