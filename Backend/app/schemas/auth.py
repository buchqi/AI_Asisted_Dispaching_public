"""
Authentication schemas.

Purpose:
- Define request/response data for login and tokens
- Keep auth API clean and predictable

These schemas are used by:
POST /auth/login
GET /auth/me
"""

from pydantic import BaseModel, EmailStr

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    """
    Schema used when user logs in.

    Used by:
    POST /auth/login
    """

    email: EmailStr
    password: str


class Token(BaseModel):
    """
    Schema returned after successful login/register.

    access_token:
        JWT token used for protected endpoints

    token_type:
        Usually "bearer"
    """

    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """
    Full auth response.

    Used when we want to return:
    - token
    - current user info
    """

    access_token: str
    token_type: str = "bearer"
    user: UserResponse