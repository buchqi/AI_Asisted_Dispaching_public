"""
In-memory WebSocket connection manager.

This MVP manager stores connections per company and per search batch.
Redis pub/sub can replace this later when the app needs multi-process
or multi-server broadcasting.
"""

from fastapi import WebSocket

try:
    import anyio
except ImportError:  # pragma: no cover - FastAPI normally provides anyio.
    anyio = None


class ConnectionManager:
    """
    Manage company and search WebSocket subscriptions.
    """

    def __init__(self):
        self.company_connections: dict[int, set[WebSocket]] = {}
        self.search_connections: dict[int, set[WebSocket]] = {}

    async def connect_company(
        self,
        company_id: int,
        websocket: WebSocket,
    ) -> None:
        """
        Accept and register a company-channel WebSocket.
        """

        await websocket.accept()
        self.company_connections.setdefault(company_id, set()).add(websocket)

    def disconnect_company(
        self,
        company_id: int,
        websocket: WebSocket,
    ) -> None:
        """
        Remove a company-channel WebSocket.
        """

        connections = self.company_connections.get(company_id)

        if not connections:
            return

        connections.discard(websocket)

        if not connections:
            self.company_connections.pop(company_id, None)

    async def connect_search(
        self,
        search_batch_id: int,
        websocket: WebSocket,
    ) -> None:
        """
        Accept and register a search-channel WebSocket.
        """

        await websocket.accept()
        self.search_connections.setdefault(search_batch_id, set()).add(
            websocket
        )

    def disconnect_search(
        self,
        search_batch_id: int,
        websocket: WebSocket,
    ) -> None:
        """
        Remove a search-channel WebSocket.
        """

        connections = self.search_connections.get(search_batch_id)

        if not connections:
            return

        connections.discard(websocket)

        if not connections:
            self.search_connections.pop(search_batch_id, None)

    async def broadcast_to_company(
        self,
        company_id: int,
        event: dict,
    ) -> None:
        """
        Broadcast an event to all company-channel clients.
        """

        await self._broadcast(
            connections=self.company_connections.get(company_id, set()),
            event=event,
        )

    async def broadcast_to_search(
        self,
        search_batch_id: int,
        event: dict,
    ) -> None:
        """
        Broadcast an event to all search-channel clients.
        """

        await self._broadcast(
            connections=self.search_connections.get(search_batch_id, set()),
            event=event,
        )

    def broadcast_to_company_sync(
        self,
        company_id: int,
        event: dict,
    ) -> None:
        """
        Broadcast to company clients from synchronous worker code.
        """

        if not self.company_connections.get(company_id):
            return

        self._run_async_from_worker(
            self.broadcast_to_company,
            company_id,
            event,
        )

    def broadcast_to_search_sync(
        self,
        search_batch_id: int,
        event: dict,
    ) -> None:
        """
        Broadcast to search clients from synchronous worker code.
        """

        if not self.search_connections.get(search_batch_id):
            return

        self._run_async_from_worker(
            self.broadcast_to_search,
            search_batch_id,
            event,
        )

    async def _broadcast(
        self,
        *,
        connections: set[WebSocket],
        event: dict,
    ) -> None:
        disconnected = []

        for websocket in list(connections):
            try:
                await websocket.send_json(event)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            connections.discard(websocket)

    def _run_async_from_worker(self, async_function, *args) -> None:
        if anyio is not None:
            try:
                anyio.from_thread.run(async_function, *args)
                return
            except RuntimeError:
                pass


manager = ConnectionManager()
