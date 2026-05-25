"""
Company schemas.

Purpose:
- Validate company creation/update requests
- Define company response format
- Keep API data separate from database models

Models = database tables
Schemas = API request/response validation
"""

from pydantic import BaseModel


class CompanyCreate(BaseModel):
    """
    Request schema for creating a company.

    Used by:
    POST /companies
    """

    name: str


class CompanyUpdate(BaseModel):
    """
    Request schema for updating a company.

    Used by:
    PATCH /companies/{company_id}

    name is optional because user may update only one field later.
    """

    name: str | None = None


class CompanyResponse(BaseModel):
    """
    Response schema for company data.

    Used by:
    GET /companies
    GET /companies/{company_id}
    POST /companies
    """

    id: int
    name: str

    class Config:
        """
        Allows Pydantic to convert SQLAlchemy Company model
        into CompanyResponse.
        """

        from_attributes = True