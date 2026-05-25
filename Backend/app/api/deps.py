"""
FastAPI dependencies.

Purpose:
- Shared reusable logic for endpoints
- Authentication dependencies
- Current user loading
- Protected route handling

Important FastAPI concept:
Dependencies allow automatic reusable logic
across multiple endpoints.

Example:
GET /auth/me
GET /companies
GET /trucks

All can reuse:
get_current_user()
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.security import decode_access_token
from app.services.auth_service import get_user_by_email


"""
OAuth2 bearer token scheme.

This tells FastAPI:

"Protected endpoints expect Bearer JWT token."

Frontend later sends:

Authorization: Bearer <JWT_TOKEN>
"""

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Get authenticated current user from JWT token.

    Flow:
    1. Extract token from Authorization header
    2. Decode JWT token
    3. Extract user id
    4. Load user from database
    5. Return authenticated user

    Used by protected endpoints.
    """

    # Decode JWT token
    payload = decode_access_token(token)

    # Invalid or expired token
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    """
    Extract user id from token payload.

    We stored it earlier as:
    data={"sub": str(user.id)}
    """

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    """
    Load user from database.

    We use id instead of email because:
    - ids are stable
    - ids are indexed
    - ids are unique
    """

    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()

    # User from token no longer exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # User account disabled
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user