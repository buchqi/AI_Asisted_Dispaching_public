"""add hidden flag to truck search sessions

Revision ID: b82f6e4d9a12
Revises: 7d3c4a2b1e90
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b82f6e4d9a12"
down_revision: Union[str, Sequence[str], None] = "7d3c4a2b1e90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "truck_search_sessions",
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("truck_search_sessions", "is_hidden", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("truck_search_sessions", "is_hidden")

