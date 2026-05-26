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

from sqlalchemy import ForeignKey, String, Text
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