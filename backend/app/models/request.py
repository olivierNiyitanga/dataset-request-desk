from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.assignment import Assignment
    from app.models.request_status_history import RequestStatusHistory
    from app.models.user import User


class RequestStatus(StrEnum):
    SUBMITTED = "submitted"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class DatasetRequest(Base):
    __tablename__ = "requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_requests_status",
        ),
        CheckConstraint("episodes_requested > 0", name="ck_requests_episodes_requested_positive"),
        Index("ix_requests_client_id", "client_id"),
        Index("ix_requests_status", "status"),
        Index("ix_requests_created_at", "created_at"),
        Index("ix_requests_deadline", "deadline"),
        Index("ix_requests_task_name", "task_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    episodes_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[RequestStatus] = mapped_column(
        String(20), nullable=False, default=RequestStatus.SUBMITTED, server_default=RequestStatus.SUBMITTED.value
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    client: Mapped["User"] = relationship(back_populates="client_requests", foreign_keys=[client_id])
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="request")
    status_history: Mapped[list["RequestStatusHistory"]] = relationship(back_populates="request")
