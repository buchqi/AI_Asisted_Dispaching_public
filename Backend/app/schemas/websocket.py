"""
Pydantic schemas for WebSocket events.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class WebSocketEvent(BaseModel):
    event_type: str
    company_id: int
    search_batch_id: int | None = None
    truck_search_session_id: int | None = None
    message: str
    data: dict[str, Any] | None = None
    timestamp: datetime
