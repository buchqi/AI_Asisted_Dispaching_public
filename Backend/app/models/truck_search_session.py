"""
Truck search session model.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TruckSearchSession(Base):
    """
    Represents one truck inside a search batch.

    Phase 8 only creates the truck-level search records.
    Real search workers and browser automation will be added later.
    """

    __tablename__ = "truck_search_sessions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    search_batch_id: Mapped[int] = mapped_column(
        ForeignKey("search_batches.id"),
        nullable=False,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    truck_id: Mapped[int] = mapped_column(
        ForeignKey("trucks.id"),
        nullable=False,
        index=True,
    )

    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="pending",
    )

    filters_snapshot: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    timeout_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_hidden: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
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

    search_batch = relationship(
        "SearchBatch",
        back_populates="truck_search_sessions",
    )
    company = relationship("Company")
    truck = relationship("Truck")
    owner = relationship("User")
    worker_logs: Mapped[list["WorkerLog"]] = relationship(
        "WorkerLog",
        back_populates="truck_search_session",
    )

    def __repr__(self):
        return (
            f"<TruckSearchSession id={self.id} "
            f"search_batch_id={self.search_batch_id} "
            f"truck_id={self.truck_id} "
            f"status={self.status}>"
        )
