"""initial schema

Revision ID: 434c4aeeb140
Revises:
Create Date: 2026-10-10 20:56:41.651504

"""

from collections.abc import Sequence

import geoalchemy2
import pgvector.sqlalchemy
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "434c4aeeb140"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Extensions are created here too, so a fresh database (tests, prod) needs no init SQL.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "places",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("era", sa.String(length=60), nullable=True),
        sa.Column("category", sa.String(length=60), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.types.Geography(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                from_text="ST_GeogFromText",
                name="geography",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.Column("radius_m", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("nickname", sa.String(length=24), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("ref_code", sa.String(length=12), nullable=False),
        sa.Column("referred_by", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["referred_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("ref_code"),
    )
    op.create_index(
        "ix_users_nickname_lower", "users", [sa.literal_column("lower(nickname)")], unique=True
    )
    op.create_table(
        "daily_game",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "date"),
    )
    op.create_table(
        "idempotency_keys",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.Uuid(), nullable=False),
        sa.Column("scope", sa.String(length=40), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "key"),
    )
    op.create_table(
        "place_refs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("place_id", sa.Uuid(), nullable=False),
        sa.Column("photo_url", sa.String(length=500), nullable=False),
        sa.Column("author", sa.String(length=200), nullable=True),
        sa.Column("embedding", pgvector.sqlalchemy.vector.VECTOR(dim=768), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["place_id"], ["places.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_place_refs_embedding_hnsw",
        "place_refs",
        ["embedding"],
        unique=False,
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.create_index(op.f("ix_place_refs_place_id"), "place_refs", ["place_id"], unique=False)
    op.create_table(
        "purchases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("item_type", sa.String(length=20), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column("price_points", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_purchases_user_id"), "purchases", ["user_id"], unique=False)
    op.create_table(
        "reels",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("place_id", sa.Uuid(), nullable=True),
        sa.Column(
            "kind",
            sa.Enum("reward", "public", name="reel_kind", native_enum=False, length=10),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("video_provider", sa.String(length=30), nullable=False),
        sa.Column("playback_url", sa.String(length=500), nullable=False),
        sa.Column("duration_s", sa.Float(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=True),
        sa.Column("price_points", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["place_id"], ["places.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reels_place_id"), "reels", ["place_id"], unique=False)
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False)
    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("place_id", sa.Uuid(), nullable=False),
        sa.Column("riddle", sa.Text(), nullable=False),
        sa.Column("archival_photo_url", sa.String(length=500), nullable=True),
        sa.Column("hints", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("base_reward_points", sa.Integer(), nullable=False),
        sa.Column("base_xp", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["place_id"], ["places.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_place_id"), "tasks", ["place_id"], unique=False)
    op.create_table(
        "wallet_ledger",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column(
            "reason",
            sa.Enum(
                "find",
                "purchase",
                "referral",
                "daily",
                "welcome",
                name="wallet_reason",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("ref_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_wallet_ledger_user", "wallet_ledger", ["user_id"], unique=False)
    op.create_index(
        "uq_wallet_ledger_ref",
        "wallet_ledger",
        ["user_id", "reason", "ref_id"],
        unique=True,
        postgresql_where=sa.text("ref_id IS NOT NULL"),
    )
    op.create_table(
        "xp_ledger",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column(
            "reason",
            sa.Enum(
                "find",
                "purchase",
                "referral",
                "daily",
                "welcome",
                name="xp_reason",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("ref_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_xp_ledger_user", "xp_ledger", ["user_id"], unique=False)
    op.create_index(
        "uq_xp_ledger_ref",
        "xp_ledger",
        ["user_id", "reason", "ref_id"],
        unique=True,
        postgresql_where=sa.text("ref_id IS NOT NULL"),
    )
    op.create_table(
        "reel_comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reel_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("text", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reel_id"], ["reels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reel_comments_reel_id"), "reel_comments", ["reel_id"], unique=False)
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
    op.create_table(
        "reel_unlocks",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("reel_id", sa.Uuid(), nullable=False),
        sa.Column(
            "source",
            sa.Enum("find", "purchase", name="unlock_source", native_enum=False, length=10),
            nullable=False,
        ),
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
    op.create_table(
        "reel_views",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reel_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reel_id"], ["reels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reel_views_reel_id"), "reel_views", ["reel_id"], unique=False)
    op.create_table(
        "task_rounds",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "completed",
                "abandoned",
                name="round_status",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("hints_used", sa.Integer(), nullable=False),
        sa.Column("reward_points", sa.Integer(), nullable=False),
        sa.Column("reward_xp", sa.Integer(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_task_rounds_one_active",
        "task_rounds",
        ["user_id", "task_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_index(op.f("ix_task_rounds_task_id"), "task_rounds", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_rounds_user_id"), "task_rounds", ["user_id"], unique=False)
    op.create_table(
        "attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("round_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("photo_key", sa.String(length=255), nullable=True),
        sa.Column(
            "gps",
            geoalchemy2.types.Geography(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeogFromText",
                name="geography",
            ),
            nullable=True,
        ),
        sa.Column("accuracy_m", sa.Float(), nullable=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "awaiting_upload",
                "queued",
                "accepted",
                "rejected",
                name="attempt_status",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("reason", sa.String(length=20), nullable=True),
        sa.Column("matched_place_id", sa.Uuid(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("verdict_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["matched_place_id"], ["places.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["round_id"], ["task_rounds.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attempts_round_id"), "attempts", ["round_id"], unique=False)
    op.create_index(op.f("ix_attempts_user_id"), "attempts", ["user_id"], unique=False)
    op.create_table(
        "finds",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=True),
        sa.Column("points_awarded", sa.Integer(), nullable=False),
        sa.Column("xp_awarded", sa.Integer(), nullable=False),
        sa.Column(
            "found_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "task_id", name="uq_finds_user_task"),
    )
    op.create_index(op.f("ix_finds_task_id"), "finds", ["task_id"], unique=False)
    op.create_index(op.f("ix_finds_user_id"), "finds", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_finds_user_id"), table_name="finds")
    op.drop_index(op.f("ix_finds_task_id"), table_name="finds")
    op.drop_table("finds")
    op.drop_index(op.f("ix_attempts_user_id"), table_name="attempts")
    op.drop_index(op.f("ix_attempts_round_id"), table_name="attempts")
    op.drop_table("attempts")
    op.drop_index(op.f("ix_task_rounds_user_id"), table_name="task_rounds")
    op.drop_index(op.f("ix_task_rounds_task_id"), table_name="task_rounds")
    op.drop_index(
        "ix_task_rounds_one_active",
        table_name="task_rounds",
        postgresql_where=sa.text("status = 'active'"),
    )
    op.drop_table("task_rounds")
    op.drop_index(op.f("ix_reel_views_reel_id"), table_name="reel_views")
    op.drop_table("reel_views")
    op.drop_table("reel_unlocks")
    op.drop_table("reel_likes")
    op.drop_index(op.f("ix_reel_comments_reel_id"), table_name="reel_comments")
    op.drop_table("reel_comments")
    op.drop_index(
        "uq_xp_ledger_ref", table_name="xp_ledger", postgresql_where=sa.text("ref_id IS NOT NULL")
    )
    op.drop_index("ix_xp_ledger_user", table_name="xp_ledger")
    op.drop_table("xp_ledger")
    op.drop_index(
        "uq_wallet_ledger_ref",
        table_name="wallet_ledger",
        postgresql_where=sa.text("ref_id IS NOT NULL"),
    )
    op.drop_index("ix_wallet_ledger_user", table_name="wallet_ledger")
    op.drop_table("wallet_ledger")
    op.drop_index(op.f("ix_tasks_place_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_index(op.f("ix_reels_place_id"), table_name="reels")
    op.drop_table("reels")
    op.drop_index(op.f("ix_purchases_user_id"), table_name="purchases")
    op.drop_table("purchases")
    op.drop_index(op.f("ix_place_refs_place_id"), table_name="place_refs")
    op.drop_index(
        "ix_place_refs_embedding_hnsw",
        table_name="place_refs",
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.drop_table("place_refs")
    op.drop_table("idempotency_keys")
    op.drop_table("daily_game")
    op.drop_index("ix_users_nickname_lower", table_name="users")
    op.drop_table("users")
    op.drop_table("places")
