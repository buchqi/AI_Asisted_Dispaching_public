"""
Load source model.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class LoadSource(Base):
    """
    Source/load-board details for one load snapshot.

    This records which simulated board produced a result in Phase 10.
    """

    __tablename__ = "load_sources"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    load_id: Mapped[int] = mapped_column(
        ForeignKey("loads.id"),
        nullable=False,
        index=True,
    )

    load_snapshot_id: Mapped[int] = mapped_column(
        ForeignKey("load_snapshots.id"),
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

    load_board_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    external_load_id: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    source_url: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    contact_email: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    contact_phone: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    load = relationship(
        "Load",
        back_populates="sources",
    )
    load_snapshot = relationship(
        "LoadSnapshot",
        back_populates="sources",
    )
    company = relationship("Company")
    truck_search_session = relationship("TruckSearchSession")

    def __repr__(self):
        return (
            f"<LoadSource id={self.id} "
            f"load_id={self.load_id} "
            f"load_board_name={self.load_board_name}>"
        )
