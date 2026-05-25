"""
Pydantic schemas for booked loads.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


BookedLoadStatus = Literal[
    "booked",
    "picked_up",
    "delivered",
    "canceled",
]


class BookLoadRequest(BaseModel):
    truck_id: int
    driver_id: int | None = None
    load_snapshot_id: int | None = None
    final_rate: float | None = None
    notes: str | None = None


class BookedLoadUpdate(BaseModel):
    status: BookedLoadStatus | None = None
    final_rate: float | None = None
    notes: str | None = None


class BookedLoadResponse(BaseModel):
    id: int
    company_id: int
    load_id: int
    load_snapshot_id: int | None
    truck_search_session_id: int | None
    truck_id: int
    driver_id: int | None
    dispatcher_user_id: int
    broker_name: str | None
    equipment_type: str | None
    origin_city: str | None
    origin_state: str | None
    destination_city: str | None
    destination_state: str | None
    pickup_date: datetime | None
    delivery_date: datetime | None
    posted_rate: float | None
    final_rate: float | None
    miles: int | None
    weight: int | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
