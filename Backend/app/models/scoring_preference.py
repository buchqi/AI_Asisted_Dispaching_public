"""
Scoring preference model.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ScoringPreference(Base):
    """
    Stores per-dispatcher rule-based scoring preferences.

    Preferences are not company-wide because different dispatchers may
    prioritize different lanes, brokers, rates, and mileage.
    """

    __tablename__ = "scoring_preferences"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "dispatcher_user_id",
            name="uq_scoring_preferences_company_dispatcher",
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

    rate_weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    rpm_weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    mileage_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    origin_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    destination_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    broker_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    driver_preference_weight: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.5,
    )

    preferred_origin_states: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    preferred_destination_states: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    preferred_brokers: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    avoided_brokers: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    max_miles: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_rate_per_mile: Mapped[float | None] = mapped_column(Float, nullable=True)

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

    def __repr__(self):
        return (
            f"<ScoringPreference id={self.id} "
            f"company_id={self.company_id} "
            f"dispatcher_user_id={self.dispatcher_user_id}>"
        )
