from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.request import RequestStatus
from app.schemas.user import UserResponse


class RequestCreate(BaseModel):
    task_name: str = Field(min_length=1, max_length=255)
    episodes_requested: int = Field(gt=0)
    deadline: date
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("task_name", "notes")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("must not be empty")
        return normalized


class RequestUpdateStatus(BaseModel):
    status: RequestStatus


class RequestReject(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("reason must not be empty")
        return normalized


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    old_status: RequestStatus
    new_status: RequestStatus
    changed_by: int
    changed_at: datetime


class RequestResponse(BaseModel):
    id: int
    client: UserResponse
    task_name: str
    episodes_requested: int
    deadline: date
    notes: str | None
    rejection_reason: str | None
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    assigned_episode_count: int
    status_history: list[StatusHistoryResponse]


class RequestListResponse(BaseModel):
    items: list[RequestResponse]
    page: int
    page_size: int
    total: int
    pages: int
