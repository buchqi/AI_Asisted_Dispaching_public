"""
Truck model.

Purpose:
- Stores company truck information
- Uses internal truck number as dispatcher-facing truck_id
- Keeps current driver display information for quick UI access

Important:
id = database primary key
truck_id = internal company truck number

Example:
id = 12
truck_id = "TRK-101"
"""

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Truck(Base):
    """
    Truck database table.

    Every row represents one truck inside one company.
    """

    __tablename__ = "trucks"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    truck_id: Mapped[str] = mapped_column(
        String,
        nullable=False,
        index=True,
    )

    current_driver_id: Mapped[int | None] = mapped_column(
        ForeignKey("drivers.id"),
        nullable=True,
        index=True,
    )

    current_driver_name: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    current_driver_surname: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    equipment_type: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="available",
    )

    current_location: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    available_from: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    max_deadhead_miles: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    min_rpm: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    max_weight: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    preferred_broker_sources: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    current_driver = relationship(
        "Driver",
        back_populates="trucks",
    )

    def __repr__(self):
        return f"<Truck id={self.id} truck_id={self.truck_id}>"
