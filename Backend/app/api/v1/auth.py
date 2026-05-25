"""
Authentication API endpoints.

Purpose:
- Register users
- Login users
- Return authenticated current user

Endpoints:
POST /auth/register
POST /auth/login
GET /auth/me

Architecture flow:

Frontend
    ↓
API endpoint
    ↓
AuthService
    ↓
Database
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.db.session import get_db

from app.schemas.user import (
    UserCreate,
    UserResponse,
)

from app.schemas.auth import (
    LoginRequest,
    AuthResponse,
)

from app.models.user import User

from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_user_access_token,
)

from app.api.deps import get_current_user


"""
Create authentication router.

All routes here will start with:
/auth
"""

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=AuthResponse,
)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register new user endpoint.

    Flow:
    1. Validate request data
    2. Create user
    3. Generate JWT token
    4. Return token + user info
    """

    # Create user in database
    user = register_user(
        db=db,
        user_data=user_data,
    )

    # Generate JWT token
    access_token = create_user_access_token(
        user=user,
    )

    # Return auth response
    return AuthResponse(
        access_token=access_token,
        user=user,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    User login endpoint.

    This uses OAuth2PasswordRequestForm because Swagger Authorize
    sends username/password as form-data, not JSON.

    In our app:
    form_data.username = user email
    form_data.password = user password
    """

    login_data = LoginRequest(
        email=form_data.username,
        password=form_data.password,
    )

    user = authenticate_user(
        db=db,
        login_data=login_data,
    )

    access_token = create_user_access_token(
        user=user,
    )

    return AuthResponse(
        access_token=access_token,
        user=user,
    )

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Get currently authenticated user.

    Protected endpoint.

    Requires:
    Authorization: Bearer <TOKEN>

    FastAPI automatically:
    - extracts token
    - validates token
    - loads current user
    """

    return current_user