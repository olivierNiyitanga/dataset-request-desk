"""Add indexes supporting analytics date and lifecycle queries.

Revision ID: 0003_add_analytics_indexes
Revises: 0002_add_rejection_reason
"""
from alembic import op

revision = "0003_add_analytics_indexes"
down_revision = "0002_add_rejection_reason"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_requests_created_at", "requests", ["created_at"], unique=False)
    op.create_index(
        "ix_request_status_history_new_status_request_changed_at",
        "request_status_history",
        ["new_status", "request_id", "changed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_request_status_history_new_status_request_changed_at", table_name="request_status_history")
    op.drop_index("ix_requests_created_at", table_name="requests")
