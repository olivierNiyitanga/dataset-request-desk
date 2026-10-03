from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_operator_or_admin
from app.models.assignment import Assignment
from app.models.user import User
from app.schemas.episode import (
    AssignmentBatchResponse,
    AssignmentCreate,
    AssignmentListResponse,
    AssignmentResponse,
)
from app.services.assignment_service import (
    AssignmentConflictError,
    AssignmentNotFoundError,
    AssignmentRemovalNotAllowedError,
    DuplicateEpisodeIdsError,
    EpisodeAlreadyAssignedError,
    EpisodeNotFoundError,
    InvalidEpisodeQualityError,
    InvalidRequestStateError,
    RequestNotFoundError,
    assign_episodes,
    list_assignments,
    remove_assignment,
)

router = APIRouter(prefix="/api/requests", tags=["assignments"])


@router.post("/{request_id}/assignments", response_model=AssignmentBatchResponse, status_code=status.HTTP_201_CREATED)
def create_assignments(
    request_id: int,
    data: AssignmentCreate,
    operator: User = Depends(require_operator_or_admin),
    session: Session = Depends(get_db),
) -> AssignmentBatchResponse:
    try:
        request, assignments = assign_episodes(session, request_id, data.episode_ids, operator)
    except RequestNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found") from None
    except DuplicateEpisodeIdsError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from None
    except EpisodeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from None
    except InvalidRequestStateError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None
    except InvalidEpisodeQualityError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from None
    except EpisodeAlreadyAssignedError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None
    except AssignmentConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None

    return AssignmentBatchResponse(
        request_id=request.id,
        assigned_count=session.scalar(
            select(func.count(Assignment.id)).where(Assignment.request_id == request.id)
        )
        or 0,
        episodes_requested=request.episodes_requested,
        assigned_episode_ids=[assignment.episode_id for assignment in assignments],
    )


@router.get("/{request_id}/assignments", response_model=AssignmentListResponse)
def get_assignments(
    request_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: User = Depends(require_operator_or_admin),
    session: Session = Depends(get_db),
) -> AssignmentListResponse:
    try:
        result = list_assignments(session, request_id, page, page_size)
    except RequestNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found") from None
    return AssignmentListResponse(
        items=result.items,
        page=page,
        page_size=page_size,
        total=result.total,
        pages=ceil(result.total / page_size) if result.total else 0,
    )


@router.delete("/{request_id}/assignments/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    request_id: int,
    episode_id: int,
    _: User = Depends(require_operator_or_admin),
    session: Session = Depends(get_db),
) -> None:
    try:
        remove_assignment(session, request_id, episode_id)
    except RequestNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found") from None
    except AssignmentNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found") from None
    except AssignmentRemovalNotAllowedError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None
