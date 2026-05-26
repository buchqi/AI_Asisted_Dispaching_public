"""
Pydantic schemas for search batches and truck search sessions.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


SearchStatus = Literal[
    "pending",
    "running",
    "completed",
    "failed",
    "canceled",
    "timeout",
]

WorkerLogLevel = Literal[
    "debug",
    "info",
    "warning",
    "error",
]


class SearchStartRequest(BaseModel):
    company_id: int
    truck_ids: list[int]
    filters: dict[str, Any] | None = None
    timeout_seconds: int | None = None


class SearchBatchResponse(BaseModel):
    id: int
    company_id: int
    created_by_user_id: int
    status: str
    filters_snapshot: dict[str, Any] | None
    total_trucks: int
    completed_trucks: int
    failed_trucks: int
    timeout_seconds: int | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TruckSearchSessionResponse(BaseModel):
    id: int
    search_batch_id: int
    company_id: int
    truck_id: int
    owner_user_id: int
    status: str
    filters_snapshot: dict[str, Any] | None
    timeout_seconds: int | None
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkerLogResponse(BaseModel):
    id: int
    truck_search_session_id: int
    company_id: int
    level: str
    message: str
    source: str | None
    metadata_json: dict[str, Any] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CancelTruckSearchResponse(BaseModel):
    session: TruckSearchSessionResponse
    message: str
