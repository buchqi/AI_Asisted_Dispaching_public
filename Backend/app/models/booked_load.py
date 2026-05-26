"""
Booked load model.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BookedLoad(Base):
    """
    Stores booked load history for a company.

    Important load details are copied at booking time so the booking record
    remains stable even if future search snapshots or raw payloads change.
    """

    __tablename__ = "booked_loads"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    load_id: Mapped[int] = mapped_column(
        ForeignKey("loads.id"),
        nullable=False,
        index=True,
    )

    load_snapshot_id: Mapped[int | None] = mapped_column(
        ForeignKey("load_snapshots.id"),
        nullable=True,
        index=True,
    )

    truck_search_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("truck_search_sessions.id"),
        nullable=True,
        index=True,
    )

    truck_id: Mapped[int] = mapped_column(
        ForeignKey("trucks.id"),
        nullable=False,
        index=True,
    )

    driver_id: Mapped[int | None] = mapped_column(
        ForeignKey("drivers.id"),
        nullable=True,
        index=True,
    )

    dispatcher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    broker_name: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    equipment_type: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    origin_city: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    origin_state: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    destination_city: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    destination_state: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    pickup_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    delivery_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    posted_rate: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    final_rate: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    miles: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    weight: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="booked",
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    company = relationship("Company")
    load = relationship("Load")
    load_snapshot = relationship("LoadSnapshot")
    truck_search_session = relationship("TruckSearchSession")
    truck = relationship("Truck")
    driver = relationship("Driver")
    dispatcher_user = relationship("User")

    def __repr__(self):
        return (
            f"<BookedLoad id={self.id} "
            f"load_id={self.load_id} "
            f"status={self.status}>"
        )
