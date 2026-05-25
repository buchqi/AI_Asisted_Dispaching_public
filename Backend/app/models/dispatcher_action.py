"""
Dispatcher action model.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DispatcherAction(Base):
    """
    Stores dispatcher action history for search result loads.

    Actions are append-only so the product can show whether a dispatcher
    saved, rejected, favorited, or contacted a load during a truck search.
    """

    __tablename__ = "dispatcher_actions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
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

    dispatcher_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    action_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    company = relationship("Company")
    truck_search_session = relationship("TruckSearchSession")
    load = relationship("Load")
    load_snapshot = relationship("LoadSnapshot")
    dispatcher = relationship("User")

    def __repr__(self):
        return (
            f"<DispatcherAction id={self.id} "
            f"truck_search_session_id={self.truck_search_session_id} "
            f"load_id={self.load_id} "
            f"action_type={self.action_type}>"
        )
