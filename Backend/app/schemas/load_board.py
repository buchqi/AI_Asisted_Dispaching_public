"""
Pydantic schemas for load-board session records.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


LoadBoardSessionStatus = Literal[
    "pending",
    "active",
    "expired",
    "error",
    "disabled",
]

LoadBoardHealthStatus = Literal[
    "unknown",
    "healthy",
    "unhealthy",
    "warning",
]


class LoadBoardSessionCreate(BaseModel):
    board_name: str
    session_label: str | None = None
    username_or_email: str | None = None


class LoadBoardSessionUpdate(BaseModel):
    board_name: str | None = None
    session_label: str | None = None
    username_or_email: str | None = None
    status: LoadBoardSessionStatus | None = None
    health_status: LoadBoardHealthStatus | None = None
    health_message: str | None = None
    debug_notes: str | None = None
    expires_at: datetime | None = None


class LoadBoardSessionHealthCheck(BaseModel):
    health_status: LoadBoardHealthStatus = "unknown"
    health_message: str | None = None
    debug_notes: str | None = None


class LoadBoardSessionResponse(BaseModel):
    id: int
    company_id: int
    board_name: str
    session_label: str | None
    username_or_email: str | None
    status: str
    health_status: str
    health_message: str | None
    debug_notes: str | None
    last_health_check_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)