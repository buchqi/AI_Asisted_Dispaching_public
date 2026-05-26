"""
CompanyMembership model.

Purpose:
- Connects users to companies
- Stores the user's role inside a specific company
- Controls whether the user has access to company data

Important concept:
A user can work in multiple companies.

Example:
User Giorgi
    |
    |-- CompanyMembership -> Company A -> role: admin
    |-- CompanyMembership -> Company B -> role: dispatcher

This table is what makes multi-company support possible.
"""

# SQLAlchemy column types and foreign key helper
from sqlalchemy import ForeignKey, String

# SQLAlchemy ORM helpers
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Base model every table inherits from
from app.db.base import Base


class CompanyMembership(Base):
    """
    CompanyMembership database table.

    Every row represents one user's membership inside one company.
    """

    # Name of PostgreSQL table
    __tablename__ = "company_memberships"

    """
    PRIMARY KEY

    Unique database ID for each membership.
    """

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    """
    User foreign key.

    This connects membership to a user.

    Example:
    user_id = 1 means this membership belongs to User with id 1.
    """

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    """
    Company foreign key.

    This connects membership to a company.

    Example:
    company_id = 3 means this membership belongs to Company with id 3.
    """

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    """
    User role inside the company.

    MVP roles:
    - admin
    - dispatcher

    admin:
        can invite/remove users and manage company settings

    dispatcher:
        can work with trucks, drivers, searches, loads, bookings
    """

    role: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="dispatcher",
    )

    """
    Membership status.

    MVP statuses:
    - active
    - invited
    - removed
    - disabled

    active:
        user can access company

    invited:
        user was invited but may not be fully active yet

    removed:
        user was removed from company

    disabled:
        access temporarily disabled
    """

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="active",
    )

    """
    Relationship back to User.

    This allows:

    membership.user

    Meaning:
    From a membership, access the related user.
    """

    user = relationship(
        "User",
        back_populates="memberships",
    )

    """
    Relationship back to Company.

    This allows:

    membership.company

    Meaning:
    From a membership, access the related company.
    """

    company = relationship(
        "Company",
        back_populates="memberships",
    )

    def __repr__(self):
        """
        Developer-friendly representation.

        Useful for debugging membership relationships.
        """

        return (
            f"<CompanyMembership id={self.id} "
            f"user_id={self.user_id} "
            f"company_id={self.company_id} "
            f"role={self.role}>"
        )