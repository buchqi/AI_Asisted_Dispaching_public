"""
Driver model.

Purpose:
- Stores full driver profile information
- Keeps driver data separate from truck data
- Allows drivers to change trucks without losing history

Important:
Truck stores only current driver display info.
Driver table stores full driver information.
"""

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Driver(Base):
    """
    Driver database table.

    Every row represents one driver inside one company.
    """

    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    first_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    home_location: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    preferences: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="active",
    )

    trucks = relationship(
        "Truck",
        back_populates="current_driver",
    )

    def __repr__(self):
        return (
            f"<Driver id={self.id} "
            f"name={self.first_name} {self.last_name}>"
        )