"""add ai explanations

Revision ID: 9f4a31c2d8b7
Revises: 0f666edeee8b
Create Date: 2026-05-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f4a31c2d8b7"
down_revision: Union[str, Sequence[str], None] = "0f666edeee8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "ai_explanations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("dispatcher_user_id", sa.Integer(), nullable=False),
        sa.Column("load_id", sa.Integer(), nullable=False),
        sa.Column("load_snapshot_id", sa.Integer(), nullable=False),
        sa.Column("scoring_result_id", sa.Integer(), nullable=False),
        sa.Column("truck_search_session_id", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("model_name", sa.String(), nullable=False),
        sa.Column("explanation_text", sa.Text(), nullable=True),
        sa.Column("prompt_version", sa.String(), nullable=False),
        sa.Column("input_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["dispatcher_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["load_id"], ["loads.id"]),
        sa.ForeignKeyConstraint(["load_snapshot_id"], ["load_snapshots.id"]),
        sa.ForeignKeyConstraint(["scoring_result_id"], ["scoring_results.id"]),
        sa.ForeignKeyConstraint(
            ["truck_search_session_id"],
            ["truck_search_sessions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "dispatcher_user_id",
            "input_hash",
            name="uq_ai_explanations_company_dispatcher_input_hash",
        ),
    )
    op.create_index(
        op.f("ix_ai_explanations_company_id"),
        "ai_explanations",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_explanations_dispatcher_user_id"),
        "ai_explanations",
        ["dispatcher_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_explanations_id"),
        "ai_explanations",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_explanations_input_hash"),
        "ai_explanations",
        ["input_hash"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_explanations_load_id"),
        "ai_explanations",
        ["load_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_explanations_load_snapshot_id"),
        "ai_explanations",
        ["load_snapshot_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_explanations_scoring_result_id"),
        "ai_explanations",
        ["scoring_result_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_explanations_truck_search_session_id"),
        "ai_explanations",
        ["truck_search_session_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_ai_explanations_truck_search_session_id"),
        table_name="ai_explanations",
    )
    op.drop_index(
        op.f("ix_ai_explanations_scoring_result_id"),
        table_name="ai_explanations",
    )
    op.drop_index(
        op.f("ix_ai_explanations_load_snapshot_id"),
        table_name="ai_explanations",
    )
    op.drop_index(
        op.f("ix_ai_explanations_load_id"),
        table_name="ai_explanations",
    )
    op.drop_index(
        op.f("ix_ai_explanations_input_hash"),
        table_name="ai_explanations",
    )
    op.drop_index(
        op.f("ix_ai_explanations_id"),
        table_name="ai_explanations",
    )
    op.drop_index(
        op.f("ix_ai_explanations_dispatcher_user_id"),
        table_name="ai_explanations",
    )
    op.drop_index(
        op.f("ix_ai_explanations_company_id"),
        table_name="ai_explanations",
    )
    op.drop_table("ai_explanations")
