"""expand truck profile fields

Revision ID: 7d3c4a2b1e90
Revises: 9f4a31c2d8b7
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7d3c4a2b1e90"
down_revision: Union[str, Sequence[str], None] = "9f4a31c2d8b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("trucks", sa.Column("current_location", sa.String(), nullable=True))
    op.add_column("trucks", sa.Column("available_from", sa.Date(), nullable=True))
    op.add_column("trucks", sa.Column("max_deadhead_miles", sa.Integer(), nullable=True))
    op.add_column("trucks", sa.Column("min_rpm", sa.Float(), nullable=True))
    op.add_column("trucks", sa.Column("max_weight", sa.Integer(), nullable=True))
    op.add_column("trucks", sa.Column("preferred_broker_sources", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("trucks", "preferred_broker_sources")
    op.drop_column("trucks", "max_weight")
    op.drop_column("trucks", "min_rpm")
    op.drop_column("trucks", "max_deadhead_miles")
    op.drop_column("trucks", "available_from")
    op.drop_column("trucks", "current_location")

