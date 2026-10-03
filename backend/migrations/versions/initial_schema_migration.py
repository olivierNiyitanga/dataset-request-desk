"""Create the initial Dataset Request Desk schema.

Revision ID: 0001_initial_schema
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum("client", "operator", "admin", name="user_role", native_enum=False, length=20)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('client', 'operator', 'admin')", name="ck_users_role"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "episodes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("episode_id", sa.String(length=255), nullable=False),
        sa.Column("robot_id", sa.String(length=255), nullable=True),
        sa.Column("task_name", sa.String(length=255), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("operator_name", sa.String(length=255), nullable=True),
        sa.Column("quality", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("quality IN ('good', 'usable', 'bad')", name="ck_episodes_quality"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("episode_id"),
    )
    for name, column in (
        ("ix_episodes_episode_id", "episode_id"),
        ("ix_episodes_robot_id", "robot_id"),
        ("ix_episodes_task_name", "task_name"),
        ("ix_episodes_quality", "quality"),
        ("ix_episodes_recorded_at", "recorded_at"),
    ):
        op.create_index(name, "episodes", [column], unique=False)

    op.create_table(
        "requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("task_name", sa.String(length=255), nullable=False),
        sa.Column("episodes_requested", sa.Integer(), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="submitted", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_requests_status",
        ),
        sa.CheckConstraint("episodes_requested > 0", name="ck_requests_episodes_requested_positive"),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for name, column in (
        ("ix_requests_client_id", "client_id"),
        ("ix_requests_status", "status"),
        ("ix_requests_deadline", "deadline"),
        ("ix_requests_task_name", "task_name"),
    ):
        op.create_index(name, "requests", [column], unique=False)

    op.create_table(
        "assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("episode_id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("assigned_by", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["episode_id"], ["episodes.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("episode_id", name="uq_assignments_episode_id"),
    )
    op.create_index("ix_assignments_episode_id", "assignments", ["episode_id"], unique=False)
    op.create_index("ix_assignments_request_id", "assignments", ["request_id"], unique=False)

    op.create_table(
        "request_status_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("old_status", sa.String(length=20), nullable=False),
        sa.Column("new_status", sa.String(length=20), nullable=False),
        sa.Column("changed_by", sa.Integer(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "old_status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_history_old_status",
        ),
        sa.CheckConstraint(
            "new_status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_history_new_status",
        ),
        sa.ForeignKeyConstraint(["changed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_request_status_history_request_id", "request_status_history", ["request_id"], unique=False)
    op.create_index("ix_request_status_history_changed_by", "request_status_history", ["changed_by"], unique=False)
    op.create_index("ix_request_status_history_changed_at", "request_status_history", ["changed_at"], unique=False)


def downgrade() -> None:
    op.drop_table("request_status_history")
    op.drop_table("assignments")
    op.drop_table("requests")
    op.drop_table("episodes")
    op.drop_table("users")
