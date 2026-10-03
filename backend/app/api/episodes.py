from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_operator_or_admin
from app.models.episode import EpisodeQuality
from app.models.user import User
from app.schemas.episode import EpisodeListResponse, EpisodeResponse
from app.services.assignment_service import EpisodeNotFoundError, get_episode, list_distinct_task_names, list_episodes

router = APIRouter(prefix="/api/episodes", tags=["episodes"])


@router.get("", response_model=EpisodeListResponse)
def get_episodes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    task: str | None = Query(default=None, max_length=255),
    task_name: str | None = Query(default=None, max_length=255),
    quality: EpisodeQuality | None = Query(default=None),
    robot_id: str | None = Query(default=None, max_length=255),
    unassigned_only: bool = Query(default=False),
    assignable_only: bool = Query(default=False),
    _: User = Depends(require_operator_or_admin),
    session: Session = Depends(get_db),
) -> EpisodeListResponse:
    result = list_episodes(
        session,
        page,
        page_size,
        task if task is not None else task_name,
        quality,
        robot_id,
        exact_task=task is not None,
        unassigned_only=unassigned_only,
        assignable_only=assignable_only,
    )
    return EpisodeListResponse(
        items=result.items,
        page=page,
        page_size=page_size,
        total=result.total,
        pages=ceil(result.total / page_size) if result.total else 0,
    )


@router.get("/tasks", response_model=list[str])
def get_episode_task_names(
    _: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> list[str]:
    return list_distinct_task_names(session)


@router.get("/{episode_id}", response_model=EpisodeResponse)
def get_episode_details(
    episode_id: int,
    _: User = Depends(require_operator_or_admin),
    session: Session = Depends(get_db),
) -> EpisodeResponse:
    try:
        return get_episode(session, episode_id)
    except EpisodeNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found") from None
