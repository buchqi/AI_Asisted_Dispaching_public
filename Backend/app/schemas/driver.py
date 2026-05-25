"""
Driver schemas.

Purpose:
- Validate driver request data
- Define driver response format
- Keep API input/output separate from database models

Driver model = database table
Driver schema = API request/response structure
"""

from pydantic import BaseModel, EmailStr


class DriverCreate(BaseModel):
    """
    Schema for creating a new driver.

    Used by:
    POST /companies/{company_id}/drivers
    """

    first_name: str
    last_name: str
    phone: str | None = None
    email: EmailStr | None = None
    home_location: str | None = None
    preferences: str | None = None
    notes: str | None = None


class DriverUpdate(BaseModel):
    """
    Schema for updating driver information.

    All fields are optional because user may update only one field.
    """

    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    home_location: str | None = None
    preferences: str | None = None
    notes: str | None = None
    status: str | None = None


class DriverResponse(BaseModel):
    """
    Schema returned to frontend.

    Does not expose unnecessary internal logic.
    """

    id: int
    company_id: int
    first_name: str
    last_name: str
    phone: str | None = None
    email: EmailStr | None = None
    home_location: str | None = None
    preferences: str | None = None
    notes: str | None = None
    status: str

    class Config:
        """
        Allows Pydantic to convert SQLAlchemy Driver model
        into DriverResponse.
        """

        from_attributes = True