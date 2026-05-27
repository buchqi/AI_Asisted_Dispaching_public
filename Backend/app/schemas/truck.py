"""
Truck schemas.

Purpose:
- Validate truck request data
- Define truck response format
- Support assigning driver to truck

Important:
truck_id here means internal company truck number.
It is NOT the database primary key.
"""

from datetime import date

from pydantic import BaseModel, Field, field_validator


def normalize_broker_sources(value: list[str] | str | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]

    return [item.strip() for item in value if item.strip()]


class TruckCreate(BaseModel):
    """
    Schema for creating a new truck.

    Used by:
    POST /companies/{company_id}/trucks
    """

    truck_id: str
    current_driver_id: int | None = None
    equipment_type: str | None = None
    status: str = "available"
    current_location: str | None = None
    available_from: date | None = None
    max_deadhead_miles: int | None = None
    min_rpm: float | None = None
    max_weight: int | None = None
    preferred_broker_sources: list[str] | str | None = None
    notes: str | None = None

    @field_validator("preferred_broker_sources", mode="before")
    @classmethod
    def validate_preferred_broker_sources(cls, value):
        return normalize_broker_sources(value)


class TruckUpdate(BaseModel):
    """
    Schema for updating truck information.

    All fields are optional because user may update only one field.
    """

    truck_id: str | None = None
    current_driver_id: int | None = None
    equipment_type: str | None = None
    status: str | None = None
    current_location: str | None = None
    available_from: date | None = None
    max_deadhead_miles: int | None = None
    min_rpm: float | None = None
    max_weight: int | None = None
    preferred_broker_sources: list[str] | str | None = None
    notes: str | None = None

    @field_validator("preferred_broker_sources", mode="before")
    @classmethod
    def validate_preferred_broker_sources(cls, value):
        return normalize_broker_sources(value)


class AssignDriverRequest(BaseModel):
    """
    Schema for assigning or unassigning driver.

    driver_id = integer means assign that driver.
    driver_id = null means unassign current driver.
    """

    driver_id: int | None = None


class TruckResponse(BaseModel):
    """
    Schema returned to frontend.

    Includes current driver display fields for fast UI rendering.
    """

    id: int
    company_id: int
    truck_id: str
    current_driver_id: int | None = None
    current_driver_name: str | None = None
    current_driver_surname: str | None = None
    equipment_type: str | None = None
    status: str
    current_location: str | None = None
    available_from: date | None = None
    max_deadhead_miles: int | None = None
    min_rpm: float | None = None
    max_weight: int | None = None
    preferred_broker_sources: list[str] = Field(default_factory=list)
    notes: str | None = None

    @field_validator("preferred_broker_sources", mode="before")
    @classmethod
    def validate_preferred_broker_sources(cls, value):
        return normalize_broker_sources(value)

    class Config:
        """
        Allows Pydantic to convert SQLAlchemy Truck model
        into TruckResponse.
        """

        from_attributes = True
