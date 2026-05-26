"""
Pydantic schemas for rule-based scoring.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.ai import AIExplanationResponse


class ScoringPreferenceUpdate(BaseModel):
    rate_weight: float | None = None
    rpm_weight: float | None = None
    mileage_weight: float | None = None
    origin_weight: float | None = None
    destination_weight: float | None = None
    broker_weight: float | None = None
    driver_preference_weight: float | None = None
    preferred_origin_states: list[str] | None = None
    preferred_destination_states: list[str] | None = None
    preferred_brokers: list[str] | None = None
    avoided_brokers: list[str] | None = None
    max_miles: int | None = None
    min_rate: float | None = None
    min_rate_per_mile: float | None = None


class ScoringPreferenceResponse(BaseModel):
    id: int
    company_id: int
    dispatcher_user_id: int
    rate_weight: float
    rpm_weight: float
    mileage_weight: float
    origin_weight: float
    destination_weight: float
    broker_weight: float
    driver_preference_weight: float
    preferred_origin_states: list[Any] | None
    preferred_destination_states: list[Any] | None
    preferred_brokers: list[Any] | None
    avoided_brokers: list[Any] | None
    max_miles: int | None
    min_rate: float | None
    min_rate_per_mile: float | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScoringResultResponse(BaseModel):
    id: int
    company_id: int
    dispatcher_user_id: int
    load_snapshot_id: int
    load_id: int
    truck_search_session_id: int | None
    score: float
    breakdown: dict[str, Any] | None
    explanation_text: str | None = None
    ai_explanation: AIExplanationResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
