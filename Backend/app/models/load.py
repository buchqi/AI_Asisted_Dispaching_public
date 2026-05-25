"""
Load model.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Load(Base):
    """
    Stable load identity after MVP deduplication.

    Search-time changing data lives in LoadSnapshot.
    Source/load-board details live in LoadSource.
    """

    __tablename__ = "loads"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "deduplication_key",
            name="uq_loads_company_deduplication_key",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    deduplication_key: Mapped[str] = mapped_column(
        String,
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
    snapshots: Mapped[list["LoadSnapshot"]] = relationship(
        "LoadSnapshot",
        back_populates="load",
    )
    sources: Mapped[list["LoadSource"]] = relationship(
        "LoadSource",
        back_populates="load",
    )

    def __repr__(self):
        return (
            f"<Load id={self.id} "
            f"company_id={self.company_id} "
            f"deduplication_key={self.deduplication_key}>"
        )
