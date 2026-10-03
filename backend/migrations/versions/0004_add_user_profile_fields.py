"""Add optional profile fields to users.

Revision ID: 0004_add_user_profile_fields
Revises: 0003_add_analytics_indexes
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_add_user_profile_fields"
down_revision = "0003_add_analytics_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("organisation", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "organisation")
    op.drop_column("users", "name")
