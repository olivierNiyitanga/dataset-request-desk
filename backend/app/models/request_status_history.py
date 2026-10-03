from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.request import DatasetRequest
    from app.models.user import User


class RequestStatusHistory(Base):
    __tablename__ = "request_status_history"
    __table_args__ = (
        CheckConstraint(
            "old_status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_history_old_status",
        ),
        CheckConstraint(
            "new_status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_history_new_status",
        ),
        Index("ix_request_status_history_request_id", "request_id"),
        Index("ix_request_status_history_changed_by", "changed_by"),
        Index("ix_request_status_history_changed_at", "changed_at"),
        Index(
            "ix_request_status_history_new_status_request_changed_at",
            "new_status",
            "request_id",
            "changed_at",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(Integer, ForeignKey("requests.id"), nullable=False)
    old_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    request: Mapped["DatasetRequest"] = relationship(back_populates="status_history")
    changed_by_user: Mapped["User"] = relationship(back_populates="status_changes", foreign_keys=[changed_by])
