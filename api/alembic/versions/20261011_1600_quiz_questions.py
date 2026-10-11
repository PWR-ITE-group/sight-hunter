"""quiz questions table and daily game points

Revision ID: 4c9f6e3d8b12
Revises: 3b8e5d2c9a71
Create Date: 2026-10-11 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "4c9f6e3d8b12"
down_revision: str | None = "3b8e5d2c9a71"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("correct_option", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("day_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quiz_questions_day_order", "quiz_questions", ["day_order"], unique=False)
    op.add_column("daily_game", sa.Column("points_awarded", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_game", "points_awarded")
    op.drop_index("ix_quiz_questions_day_order", table_name="quiz_questions")
    op.drop_table("quiz_questions")
