"""
Scoring result model.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ScoringResult(Base):
    """
    Stores the current rule-based score for one dispatcher and load snapshot.

    Recalculation updates the existing row instead of creating duplicate
    scores for the same dispatcher/snapshot pair.
    """

    __tablename__ = "scoring_results"
    __table_args__ = (
        UniqueConstraint(
            "dispatcher_user_id",
            "load_snapshot_id",
            name="uq_scoring_results_dispatcher_snapshot",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )
    dispatcher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    load_snapshot_id: Mapped[int] = mapped_column(
        ForeignKey("load_snapshots.id"),
        nullable=False,
        index=True,
    )
    load_id: Mapped[int] = mapped_column(
        ForeignKey("loads.id"),
        nullable=False,
        index=True,
    )
    truck_search_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("truck_search_sessions.id"),
        nullable=True,
        index=True,
    )
    score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        index=True,
    )
    breakdown: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
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
    dispatcher_user = relationship("User")
    load_snapshot = relationship("LoadSnapshot")
    load = relationship("Load")
    truck_search_session = relationship("TruckSearchSession")

    def __repr__(self):
        return (
            f"<ScoringResult id={self.id} "
            f"load_snapshot_id={self.load_snapshot_id} "
            f"score={self.score}>"
        )
