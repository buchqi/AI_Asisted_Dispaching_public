"""
User model.

Purpose:
- Represents a system user/dispatcher
- Stores authentication information
- Stores profile information
- Connects users to companies through memberships

Important concept:
A user DOES NOT directly belong to one company.

Instead:
User
    ↕
CompanyMembership
    ↕
Company

This allows:
- one user working in multiple companies
- flexible permissions
- scalable company structure

Future examples:
- dispatcher
- company admin
- owner
"""

# SQLAlchemy column types
from sqlalchemy import String, Boolean

# SQLAlchemy ORM helpers
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Base model every table inherits from
from app.db.base import Base


class User(Base):
    """
    User database table.

    Every row in this table represents one user account.
    """

    # Name of PostgreSQL table
    __tablename__ = "users"

    """
    PRIMARY KEY

    Unique identifier for each user.

    Example:
    id = 1
    id = 2
    """

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    """
    User email address.

    Used for:
    - login
    - authentication
    - communication

    unique=True:
        prevents duplicate emails

    index=True:
        makes email lookups faster
    """

    email: Mapped[str] = mapped_column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    """
    Hashed password.

    IMPORTANT:
    We NEVER store plain passwords.

    Real password:
        mypassword123

    Stored password:
        hashed/encrypted version

    Later:
    AuthService will hash passwords before saving.
    """

    hashed_password: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    """
    User first name.

    Example:
    Giorgi
    """

    first_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    """
    User last name.

    Example:
    Tkebuchava
    """

    last_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    """
    User phone number.

    Optional because some users may not provide it.
    """

    phone: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    """
    User timezone.

    Important for:
    - scheduling
    - timestamps
    - future notifications
    - company operations

    Example:
    Europe/Tbilisi
    """

    timezone: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    """
    Is user account active?

    Instead of deleting users completely,
    we usually disable/deactivate them.

    Default:
    True
    """

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    """
    Relationship to company memberships.

    This creates ORM connection:

    user.memberships

    Example:
    current_user.memberships

    SQLAlchemy automatically connects:
    User ↔ CompanyMembership
    """

    memberships = relationship(
        "CompanyMembership",
        back_populates="user",
    )

    def __repr__(self):
        """
        Developer-friendly string representation.

        Useful for:
        - debugging
        - logging
        - terminal output
        """

        return f"<User id={self.id} email={self.email}>"