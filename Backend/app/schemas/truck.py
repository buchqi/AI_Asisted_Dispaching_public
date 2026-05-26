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

from pydantic import BaseModel


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
    notes: str | None = None


class TruckUpdate(BaseModel):
    """
    Schema for updating truck information.

    All fields are optional because user may update only one field.
    """

    truck_id: str | None = None
    current_driver_id: int | None = None
    equipment_type: str | None = None
    status: str | None = None
    notes: str | None = None


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
    notes: str | None = None

    class Config:
        """
        Allows Pydantic to convert SQLAlchemy Truck model
        into TruckResponse.
        """

        from_attributes = True