"""
Load snapshot model.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class LoadSnapshot(Base):
    """
    Search-time load data that can change between searches.

    Each mock search observation creates a new snapshot, even when the
    stable Load record is reused by deduplication.
    """

    __tablename__ = "load_snapshots"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    load_id: Mapped[int] = mapped_column(
        ForeignKey("loads.id"),
        nullable=False,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    truck_search_session_id: Mapped[int] = mapped_column(
        ForeignKey("truck_search_sessions.id"),
        nullable=False,
        index=True,
    )

    posted_rate: Mapped[float | None] = mapped_column(
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

    pickup_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    delivery_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    raw_payload: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    load = relationship(
        "Load",
        back_populates="snapshots",
    )
    company = relationship("Company")
    truck_search_session = relationship("TruckSearchSession")
    sources: Mapped[list["LoadSource"]] = relationship(
        "LoadSource",
        back_populates="load_snapshot",
    )

    def __repr__(self):
        return (
            f"<LoadSnapshot id={self.id} "
            f"load_id={self.load_id} "
            f"truck_search_session_id={self.truck_search_session_id}>"
        )
