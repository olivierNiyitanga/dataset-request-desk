from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.assignment import Assignment
from app.models.request import DatasetRequest, RequestStatus
from app.models.request_status_history import RequestStatusHistory
from app.models.user import User, UserRole
from app.schemas.request import RequestCreate


class RequestServiceError(Exception):
    pass


class RequestNotFoundError(RequestServiceError):
    pass


class InvalidTransitionError(RequestServiceError):
    pass


class TransitionNotAllowedError(RequestServiceError):
    pass


class DeliveryNotReadyError(RequestServiceError):
    pass


class RejectionReasonRequiredError(RequestServiceError):
    pass


@dataclass(frozen=True)
class RequestPage:
    items: list[DatasetRequest]
    total: int


_ALLOWED_TRANSITIONS: dict[RequestStatus, set[RequestStatus]] = {
    RequestStatus.SUBMITTED: {RequestStatus.IN_PROGRESS},
    RequestStatus.IN_PROGRESS: {RequestStatus.DELIVERED},
    RequestStatus.DELIVERED: {RequestStatus.ACCEPTED, RequestStatus.REJECTED},
    RequestStatus.REJECTED: {RequestStatus.IN_PROGRESS},
    RequestStatus.ACCEPTED: set(),
}

_CLIENT_TRANSITIONS = {RequestStatus.ACCEPTED, RequestStatus.REJECTED}
_OPERATOR_TRANSITIONS = {
    RequestStatus.IN_PROGRESS,
    RequestStatus.DELIVERED,
}


def create_request(session: Session, client: User, data: RequestCreate) -> DatasetRequest:
    request = DatasetRequest(
        client_id=client.id,
        task_name=data.task_name,
        episodes_requested=data.episodes_requested,
        deadline=data.deadline,
        notes=data.notes,
        status=RequestStatus.SUBMITTED,
    )
    session.add(request)
    session.flush()
    session.add(
        RequestStatusHistory(
            request_id=request.id,
            old_status=RequestStatus.SUBMITTED.value,
            new_status=RequestStatus.SUBMITTED.value,
            changed_by=client.id,
        )
    )
    try:
        session.commit()
        session.refresh(request)
    except SQLAlchemyError:
        session.rollback()
        raise
    return request


def list_requests(
    session: Session,
    user: User,
    page: int,
    page_size: int,
    status_filter: RequestStatus | None,
    task_name: str | None,
) -> RequestPage:
    filters = []
    if user.role == UserRole.CLIENT:
        filters.append(DatasetRequest.client_id == user.id)
    if status_filter is not None:
        filters.append(DatasetRequest.status == status_filter)
    if task_name:
        filters.append(DatasetRequest.task_name.ilike(f"%{task_name.strip()}%"))

    base_query = select(DatasetRequest).where(*filters)
    total = session.scalar(select(func.count()).select_from(base_query.subquery())) or 0
    items = list(
        session.scalars(
            base_query.options(
                selectinload(DatasetRequest.client),
                selectinload(DatasetRequest.status_history),
            )
            .order_by(DatasetRequest.created_at.desc(), DatasetRequest.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return RequestPage(items=items, total=total)


def get_request(session: Session, request_id: int, user: User) -> DatasetRequest:
    query = (
        select(DatasetRequest)
        .where(DatasetRequest.id == request_id)
        .options(
            selectinload(DatasetRequest.client),
            selectinload(DatasetRequest.status_history),
        )
    )
    if user.role == UserRole.CLIENT:
        query = query.where(DatasetRequest.client_id == user.id)
    request = session.scalar(query)
    if request is None:
        raise RequestNotFoundError
    return request


def _assigned_episode_count(session: Session, request_id: int) -> int:
    return session.scalar(select(func.count(Assignment.id)).where(Assignment.request_id == request_id)) or 0


def get_assigned_episode_count(session: Session, request_id: int) -> int:
    return _assigned_episode_count(session, request_id)


def transition_request(
    session: Session,
    request_id: int,
    user: User,
    target_status: RequestStatus,
    rejection_reason: str | None = None,
) -> DatasetRequest:
    request = session.scalar(
        select(DatasetRequest)
        .where(DatasetRequest.id == request_id)
        .with_for_update()
    )
    if request is None:
        raise RequestNotFoundError
    if user.role == UserRole.CLIENT and request.client_id != user.id:
        raise RequestNotFoundError

    current_status = RequestStatus(request.status)
    if target_status not in _ALLOWED_TRANSITIONS[current_status]:
        raise InvalidTransitionError(f"Cannot transition from {current_status.value} to {target_status.value}")

    if user.role == UserRole.CLIENT:
        if target_status not in _CLIENT_TRANSITIONS:
            raise TransitionNotAllowedError
    elif user.role in {UserRole.OPERATOR, UserRole.ADMIN}:
        if target_status not in _OPERATOR_TRANSITIONS:
            raise TransitionNotAllowedError
    else:
        raise TransitionNotAllowedError

    if target_status == RequestStatus.REJECTED:
        if not rejection_reason or not rejection_reason.strip():
            raise RejectionReasonRequiredError
        request.rejection_reason = rejection_reason.strip()

    if target_status == RequestStatus.DELIVERED:
        assigned_count = _assigned_episode_count(session, request.id)
        if assigned_count < request.episodes_requested:
            raise DeliveryNotReadyError(
                f"At least {request.episodes_requested} assigned episodes are required; found {assigned_count}"
            )

    old_status = current_status
    request.status = target_status
    session.add(
        RequestStatusHistory(
            request_id=request.id,
            old_status=old_status.value,
            new_status=target_status.value,
            changed_by=user.id,
        )
    )
    try:
        session.commit()
        session.refresh(request)
    except SQLAlchemyError:
        session.rollback()
        raise
    return request
