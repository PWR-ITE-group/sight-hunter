"""drop reel likes

Revision ID: 7f1c2b9d4e63
Revises: 434c4aeeb140
Create Date: 2026-10-11 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7f1c2b9d4e63"
down_revision: str | None = "434c4aeeb140"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Team decision 2026-10-11: reels show how many players found the place, not likes.
    op.drop_table("reel_likes")


def downgrade() -> None:
    op.create_table(
        "reel_likes",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("reel_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reel_id"], ["reels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "reel_id"),
    )
