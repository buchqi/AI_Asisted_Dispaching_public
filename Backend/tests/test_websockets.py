import asyncio

from app.websockets.connection_manager import ConnectionManager
from app.websockets.events import create_ws_event


class DummyWebSocket:
    def __init__(self):
        self.accepted = False
        self.sent_events = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, event):
        self.sent_events.append(event)


def test_create_ws_event_shape():
    event = create_ws_event(
        event_type="worker.started",
        company_id=1,
        search_batch_id=2,
        truck_search_session_id=3,
        message="Mock worker started.",
        data={"source": "test"},
    )

    assert event["event_type"] == "worker.started"
    assert event["company_id"] == 1
    assert event["search_batch_id"] == 2
    assert event["truck_search_session_id"] == 3
    assert event["message"] == "Mock worker started."
    assert event["data"] == {"source": "test"}
    assert "timestamp" in event


def test_connection_manager_connects_broadcasts_and_disconnects():
    asyncio.run(run_connection_manager_check())


async def run_connection_manager_check():
    manager = ConnectionManager()
    websocket = DummyWebSocket()
    event = create_ws_event(
        event_type="search.started",
        company_id=1,
        search_batch_id=2,
        message="Search started.",
    )

    await manager.connect_company(
        company_id=1,
        websocket=websocket,
    )
    await manager.connect_search(
        search_batch_id=2,
        websocket=websocket,
    )

    await manager.broadcast_to_company(
        company_id=1,
        event=event,
    )
    await manager.broadcast_to_search(
        search_batch_id=2,
        event=event,
    )

    assert websocket.accepted is True
    assert websocket.sent_events == [event, event]

    manager.disconnect_company(
        company_id=1,
        websocket=websocket,
    )
    manager.disconnect_search(
        search_batch_id=2,
        websocket=websocket,
    )

    assert 1 not in manager.company_connections
    assert 2 not in manager.search_connections
