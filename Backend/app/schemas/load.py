"""
Pydantic schemas for load result storage.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.ai import AIExplanationResponse


class LoadResponse(BaseModel):
    id: int
    company_id: int
    deduplication_key: str
    broker_name: str | None
    equipment_type: str | None
    origin_city: str | None
    origin_state: str | None
    destination_city: str | None
    destination_state: str | None
    pickup_date: datetime | None
    delivery_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoadSourceResponse(BaseModel):
    id: int
    load_id: int
    load_snapshot_id: int
    company_id: int
    truck_search_session_id: int
    load_board_name: str
    external_load_id: str | None
    source_url: str | None
    contact_email: str | None
    contact_phone: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoadSnapshotResponse(BaseModel):
    id: int
    load_id: int
    company_id: int
    truck_search_session_id: int
    posted_rate: float | None
    miles: int | None
    weight: int | None
    pickup_date: datetime | None
    delivery_date: datetime | None
    raw_payload: dict[str, Any] | None
    created_at: datetime
    load: LoadResponse | None = None
    sources: list[LoadSourceResponse] = []
    action_state: dict[str, bool] | None = None
    score: float | None = None
    score_breakdown: dict[str, Any] | None = None
    explanation_text: str | None = None
    ai_explanation: AIExplanationResponse | None = None

    model_config = ConfigDict(from_attributes=True)
