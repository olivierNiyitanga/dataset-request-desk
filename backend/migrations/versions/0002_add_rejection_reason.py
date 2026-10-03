"""Add the latest rejection reason to requests.

Revision ID: 0002_add_rejection_reason
Revises: 0001_initial_schema
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_add_rejection_reason"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("requests", sa.Column("rejection_reason", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("requests", "rejection_reason")
