"""place slug and reference photo metadata

Revision ID: 3b8e5d2c9a71
Revises: 7f1c2b9d4e63
Create Date: 2026-10-11 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3b8e5d2c9a71"
down_revision: str | None = "7f1c2b9d4e63"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Columns the content CLIs in worker/ (seed_dev, add_refs) match on and record.
    op.add_column("places", sa.Column("slug", sa.String(length=60), nullable=True))
    op.create_unique_constraint("uq_places_slug", "places", ["slug"])
    op.add_column("place_refs", sa.Column("source_url", sa.String(length=500), nullable=True))
    op.add_column("place_refs", sa.Column("license", sa.String(length=100), nullable=True))
    op.add_column("place_refs", sa.Column("sha256", sa.String(length=64), nullable=True))
    op.add_column("place_refs", sa.Column("model", sa.String(length=100), nullable=True))
    op.create_unique_constraint("uq_place_refs_place_sha256", "place_refs", ["place_id", "sha256"])


def downgrade() -> None:
    op.drop_constraint("uq_place_refs_place_sha256", "place_refs", type_="unique")
    op.drop_column("place_refs", "model")
    op.drop_column("place_refs", "sha256")
    op.drop_column("place_refs", "license")
    op.drop_column("place_refs", "source_url")
    op.drop_constraint("uq_places_slug", "places", type_="unique")
    op.drop_column("places", "slug")
