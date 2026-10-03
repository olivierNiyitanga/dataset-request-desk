from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.episode import EpisodeQuality


class AssignmentSummary(BaseModel):
    id: int
    request_id: int
    assigned_at: datetime
    assigned_by: int


class EpisodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    episode_id: str
    robot_id: str | None
    task_name: str | None
    recorded_at: datetime | None
    duration_seconds: int | None
    operator_name: str | None
    quality: EpisodeQuality | None
    assignment: AssignmentSummary | None


class EpisodeListResponse(BaseModel):
    items: list[EpisodeResponse]
    page: int
    page_size: int
    total: int
    pages: int


class AssignmentCreate(BaseModel):
    episode_ids: list[int] = Field(min_length=1, max_length=1000)

    @property
    def has_duplicate_ids(self) -> bool:
        return len(self.episode_ids) != len(set(self.episode_ids))


class AssignedEpisodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    episode_id: str
    robot_id: str | None
    task_name: str | None
    recorded_at: datetime | None
    duration_seconds: int | None
    operator_name: str | None
    quality: EpisodeQuality | None


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    episode_id: int
    assigned_at: datetime
    assigned_by: int
    episode: AssignedEpisodeResponse


class AssignmentListResponse(BaseModel):
    items: list[AssignmentResponse]
    page: int
    page_size: int
    total: int
    pages: int


class AssignmentBatchResponse(BaseModel):
    request_id: int
    assigned_count: int
    episodes_requested: int
    assigned_episode_ids: list[int]
