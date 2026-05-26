"""
Worker log model.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class WorkerLog(Base):
    """
    Stores future worker, mock-provider, and debug logs.

    Phase 8 only persists log records.
    Real worker execution and load-board searching will be added later.
    """

    __tablename__ = "worker_logs"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    truck_search_session_id: Mapped[int] = mapped_column(
        ForeignKey("truck_search_sessions.id"),
        nullable=False,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    level: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="info",
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    source: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    truck_search_session = relationship(
        "TruckSearchSession",
        back_populates="worker_logs",
    )
    company = relationship("Company")

    def __repr__(self):
        return (
            f"<WorkerLog id={self.id} "
            f"truck_search_session_id={self.truck_search_session_id} "
            f"level={self.level}>"
        )
