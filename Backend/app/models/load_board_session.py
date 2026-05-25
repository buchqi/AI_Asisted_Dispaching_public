"""
Load board session model.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.company import Company


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class LoadBoardSession(Base):
    """
    Stores company-level load-board session records.

    Real browser sessions/cookies are NOT stored yet.
    Browser automation will be added in later phases.
    """

    __tablename__ = "load_board_sessions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    board_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    session_label: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    username_or_email: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="pending",
    )

    health_status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="unknown",
    )

    health_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    debug_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    last_health_check_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
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

    company: Mapped["Company"] = relationship("Company")
    def __repr__(self):
        return (
            f"<LoadBoardSession id={self.id} "
            f"company_id={self.company_id} "
            f"board_name={self.board_name} "
            f"status={self.status}>"
        )
