"""
Authentication service.

Purpose:
- Handle user registration
- Handle user login
- Hash passwords before saving
- Verify passwords during login
- Create JWT access tokens

Important architecture rule:
API routes should stay thin.
Business logic should live inside services.

So auth.py endpoint will call functions from this file.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
from app.schemas.auth import LoginRequest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


def get_user_by_email(
    db: Session,
    email: str,
) -> User | None:
    """
    Find user by email.

    Used for:
    - checking duplicate registration
    - login authentication
    """

    return db.query(User).filter(User.email == email).first()


def register_user(
    db: Session,
    user_data: UserCreate,
) -> User:
    """
    Register a new user.

    Flow:
    1. Check if email already exists
    2. Hash raw password
    3. Create User model object
    4. Save user to database
    5. Return created user
    """

    existing_user = get_user_by_email(
        db=db,
        email=user_data.email,
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    hashed_password = hash_password(user_data.password)

    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        timezone=user_data.timezone,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def authenticate_user(
    db: Session,
    login_data: LoginRequest,
) -> User:
    """
    Authenticate user login.

    Flow:
    1. Find user by email
    2. Verify password
    3. Check user is active
    4. Return user if valid
    """

    user = get_user_by_email(
        db=db,
        email=login_data.email,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    password_is_valid = verify_password(
        plain_password=login_data.password,
        hashed_password=user.hashed_password,
    )

    if not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def create_user_access_token(user: User) -> str:
    """
    Create JWT token for authenticated user.

    The "sub" field usually means subject.
    Here we store user id as token subject.

    Later, protected endpoints will decode token
    and use this id to load current user.
    """

    return create_access_token(
        data={"sub": str(user.id)}
    )