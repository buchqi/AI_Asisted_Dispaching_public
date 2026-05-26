"""
Security utilities.

Purpose:
- Hash passwords
- Verify passwords
- Create JWT access tokens
- Decode JWT tokens

This file handles authentication security logic.

Important:
We NEVER store plain passwords in database.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

# JWT library
from jose import JWTError, jwt

# Password hashing library
from passlib.context import CryptContext

# App settings
from app.core.config import settings


"""
Password hashing configuration.

bcrypt is one of the most common password hashing algorithms.
"""

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

"""
JWT algorithm.

HS256 is commonly used for JWT signing.
"""

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """
    Hash plain password before storing in database.

    Example:
    "mypassword123"
        ->
    "$2b$12$abc123..."
    """

    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Verify user login password.

    Compares:
    entered password
        vs
    hashed database password
    """

    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create JWT access token.

    JWT contains encoded user information.

    Example payload:
    {
        "sub": "user@gmail.com",
        "exp": expiration_timestamp
    }
    """

    # Copy original payload
    to_encode = data.copy()

    """
    Token expiration logic.

    If custom expiration provided:
        use it

    Otherwise:
        use default from settings
    """

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta

    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Add expiration timestamp to payload
    to_encode.update({"exp": expire})

    """
    Encode JWT token.

    SECRET_KEY signs the token.
    """

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return encoded_jwt


def decode_access_token(token: str):
    """
    Decode and verify JWT token.

    Returns token payload if valid.

    Raises error if:
    - token invalid
    - token expired
    - signature invalid
    """

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        return payload

    except JWTError:
        return None