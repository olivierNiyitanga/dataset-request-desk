from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.assignment import Assignment


class EpisodeQuality(StrEnum):
    GOOD = "good"
    USABLE = "usable"
    BAD = "bad"


class Episode(Base):
    __tablename__ = "episodes"
    __table_args__ = (
        CheckConstraint("quality IN ('good', 'usable', 'bad')", name="ck_episodes_quality"),
        Index("ix_episodes_robot_id", "robot_id"),
        Index("ix_episodes_task_name", "task_name"),
        Index("ix_episodes_quality", "quality"),
        Index("ix_episodes_recorded_at", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    episode_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    robot_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    task_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    operator_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quality: Mapped[EpisodeQuality | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    assignment: Mapped["Assignment | None"] = relationship(back_populates="episode", uselist=False)
