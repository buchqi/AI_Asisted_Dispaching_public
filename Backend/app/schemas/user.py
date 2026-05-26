"""
User schemas.

Purpose:
- Define what user data API accepts
- Define what user data API returns
- Prevent exposing sensitive database fields

Important:
The User database model contains hashed_password.
But API responses should NEVER return hashed_password.

Models = database tables
Schemas = API input/output validation
"""

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """
    Schema used when registering a new user.

    Used by:
    POST /auth/register
    """

    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str | None = None
    timezone: str | None = None


class UserResponse(BaseModel):
    """
    Schema returned to frontend after user is created or fetched.

    Important:
    This does NOT include hashed_password.
    """

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    timezone: str | None = None
    is_active: bool

    class Config:
        """
        Allows Pydantic to read data from SQLAlchemy model objects.

        Without this:
        FastAPI may not convert User model -> UserResponse correctly.
        """

        from_attributes = True