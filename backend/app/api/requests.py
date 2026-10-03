from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_client
from app.models.request import RequestStatus
from app.models.user import User
from app.schemas.request import (
    RequestCreate,
    RequestListResponse,
    RequestReject,
    RequestResponse,
    RequestUpdateStatus,
)
from app.services.request_service import (
    DeliveryNotReadyError,
    InvalidTransitionError,
    RejectionReasonRequiredError,
    RequestNotFoundError,
    TransitionNotAllowedError,
    create_request,
    get_request,
    list_requests,
    transition_request,
    get_assigned_episode_count,
)

router = APIRouter(prefix="/api/requests", tags=["requests"])


def _to_response(request, session: Session) -> RequestResponse:
    return RequestResponse(
        id=request.id,
        client=request.client,
        task_name=request.task_name,
        episodes_requested=request.episodes_requested,
        deadline=request.deadline,
        notes=request.notes,
        rejection_reason=request.rejection_reason,
        status=request.status,
        created_at=request.created_at,
        updated_at=request.updated_at,
        assigned_episode_count=get_assigned_episode_count(session, request.id),
        status_history=request.status_history,
    )


def _get_visible_request(session: Session, request_id: int, user: User):
    try:
        return get_request(session, request_id, user)
    except RequestNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found") from None


@router.post("", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_dataset_request(
    data: RequestCreate,
    client: User = Depends(require_client),
    session: Session = Depends(get_db),
) -> RequestResponse:
    return _to_response(create_request(session, client, data), session)


@router.get("", response_model=RequestListResponse)
def get_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: RequestStatus | None = Query(default=None, alias="status"),
    task_name: str | None = Query(default=None, max_length=255),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> RequestListResponse:
    result = list_requests(session, user, page, page_size, status_filter, task_name)
    return RequestListResponse(
        items=[_to_response(request, session) for request in result.items],
        page=page,
        page_size=page_size,
        total=result.total,
        pages=ceil(result.total / page_size) if result.total else 0,
    )


@router.get("/{request_id}", response_model=RequestResponse)
def get_request_details(
    request_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> RequestResponse:
    return _to_response(_get_visible_request(session, request_id, user), session)


def _transition_response(
    request_id: int,
    target_status: RequestStatus,
    user: User,
    session: Session,
    rejection_reason: str | None = None,
) -> RequestResponse:
    try:
        request = transition_request(session, request_id, user, target_status, rejection_reason)
    except RequestNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found") from None
    except TransitionNotAllowedError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Transition not allowed for this role") from None
    except RejectionReasonRequiredError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rejection reason is required") from None
    except DeliveryNotReadyError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None
    except InvalidTransitionError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None
    return _to_response(request, session)


@router.patch("/{request_id}/status", response_model=RequestResponse)
def update_request_status(
    request_id: int,
    data: RequestUpdateStatus,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> RequestResponse:
    return _transition_response(request_id, data.status, user, session)


@router.post("/{request_id}/accept", response_model=RequestResponse)
def accept_request(
    request_id: int,
    client: User = Depends(require_client),
    session: Session = Depends(get_db),
) -> RequestResponse:
    return _transition_response(request_id, RequestStatus.ACCEPTED, client, session)


@router.post("/{request_id}/reject", response_model=RequestResponse)
def reject_request(
    request_id: int,
    data: RequestReject,
    client: User = Depends(require_client),
    session: Session = Depends(get_db),
) -> RequestResponse:
    return _transition_response(request_id, RequestStatus.REJECTED, client, session, data.reason)
