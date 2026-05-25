"""
Company model.

Purpose:
- Represents a dispatch company using the platform
- Owns company-level data like trucks, drivers, searches, and bookings
- Connects to users through CompanyMembership

Important concept:
Users do not directly own trucks, drivers, or loads.
Companies own operational data.

Example:
Company
    ├── Trucks
    ├── Drivers
    ├── Searches
    ├── Load board sessions
    └── Booked loads
"""

# SQLAlchemy column types
from sqlalchemy import String

# SQLAlchemy ORM helpers
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Base model every table inherits from
from app.db.base import Base


class Company(Base):
    """
    Company database table.

    Every row represents one dispatch company.
    """

    # Name of PostgreSQL table
    __tablename__ = "companies"

    """
    PRIMARY KEY

    Unique database ID for each company.
    """

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    """
    Company name.

    Example:
    ABC Dispatch LLC
    """

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
        index=True,
    )

    """
    Relationship to company memberships.

    This allows:

    company.memberships

    Meaning:
    Get all users connected to this company.
    """

    memberships = relationship(
        "CompanyMembership",
        back_populates="company",
    )

    def __repr__(self):
        """
        Developer-friendly representation.

        Useful for debugging.
        """

        return f"<Company id={self.id} name={self.name}>"