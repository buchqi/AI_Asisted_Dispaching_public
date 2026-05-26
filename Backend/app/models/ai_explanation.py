"""
AI explanation model.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AIExplanation(Base):
    """
    Optional LLM explanation for a high-ranked rule-scored load.

    The rule-based score remains the source of truth. This row only stores a
    concise explanation generated from the load snapshot and scoring result.
    """

    __tablename__ = "ai_explanations"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "dispatcher_user_id",
            "input_hash",
            name="uq_ai_explanations_company_dispatcher_input_hash",
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
    scoring_result_id: Mapped[int] = mapped_column(
        ForeignKey("scoring_results.id"),
        nullable=False,
        index=True,
    )
    truck_search_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("truck_search_sessions.id"),
        nullable=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    model_name: Mapped[str] = mapped_column(String, nullable=False)
    explanation_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_version: Mapped[str] = mapped_column(String, nullable=False)
    input_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
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
    load = relationship("Load")
    load_snapshot = relationship("LoadSnapshot")
    scoring_result = relationship("ScoringResult")
    truck_search_session = relationship("TruckSearchSession")

    def __repr__(self):
        return (
            f"<AIExplanation id={self.id} "
            f"load_snapshot_id={self.load_snapshot_id} "
            f"provider={self.provider}>"
        )
