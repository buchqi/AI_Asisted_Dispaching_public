"""
WebSocket event helpers.
"""

from datetime import datetime, timezone
from typing import Any


def create_ws_event(
    *,
    event_type: str,
    company_id: int,
    search_batch_id: int | None = None,
    truck_search_session_id: int | None = None,
    message: str,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Create the standard WebSocket event payload.
    """

    return {
        "event_type": event_type,
        "company_id": company_id,
        "search_batch_id": search_batch_id,
        "truck_search_session_id": truck_search_session_id,
        "message": message,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
