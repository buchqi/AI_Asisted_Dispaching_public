"""
Search batch model.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SearchBatch(Base):
    """
    Represents one dispatcher-started search operation.

    Phase 8 only stores search records and copied filters.
    Real load-board searching will be added in later phases.
    """

    __tablename__ = "search_batches"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    created_by_user_id: Mapped[int] = mapped_column(
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

    total_trucks: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    completed_trucks: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    failed_trucks: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
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
    created_by = relationship("User")
    truck_search_sessions: Mapped[list["TruckSearchSession"]] = relationship(
        "TruckSearchSession",
        back_populates="search_batch",
    )

    def __repr__(self):
        return (
            f"<SearchBatch id={self.id} "
            f"company_id={self.company_id} "
            f"status={self.status}>"
        )
