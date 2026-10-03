from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.episode import Episode
    from app.models.request import DatasetRequest
    from app.models.user import User


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (
        UniqueConstraint("episode_id", name="uq_assignments_episode_id"),
        Index("ix_assignments_episode_id", "episode_id"),
        Index("ix_assignments_request_id", "request_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    episode_id: Mapped[int] = mapped_column(Integer, ForeignKey("episodes.id"), nullable=False)
    request_id: Mapped[int] = mapped_column(Integer, ForeignKey("requests.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    assigned_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    episode: Mapped["Episode"] = relationship(back_populates="assignment")
    request: Mapped["DatasetRequest"] = relationship(back_populates="assignments")
    assigner: Mapped["User"] = relationship(back_populates="assignments", foreign_keys=[assigned_by])
