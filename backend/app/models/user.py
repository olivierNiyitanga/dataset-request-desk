from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.assignment import Assignment
    from app.models.request import DatasetRequest
    from app.models.request_status_history import RequestStatusHistory


class UserRole(StrEnum):
    CLIENT = "client"
    OPERATOR = "operator"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('client', 'operator', 'admin')", name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organisation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            native_enum=False,
            length=20,
            values_callable=lambda roles: [role.value for role in roles],
        ),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    client_requests: Mapped[list["DatasetRequest"]] = relationship(
        back_populates="client", foreign_keys="DatasetRequest.client_id"
    )
    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="assigner", foreign_keys="Assignment.assigned_by"
    )
    status_changes: Mapped[list["RequestStatusHistory"]] = relationship(
        back_populates="changed_by_user", foreign_keys="RequestStatusHistory.changed_by"
    )
