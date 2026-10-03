from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.assignment import Assignment
from app.models.episode import Episode, EpisodeQuality
from app.models.request import DatasetRequest, RequestStatus
from app.models.user import User


class AssignmentServiceError(Exception):
    pass


class RequestNotFoundError(AssignmentServiceError):
    pass


class EpisodeNotFoundError(AssignmentServiceError):
    def __init__(self, episode_ids: list[int]):
        self.episode_ids = episode_ids
        super().__init__(f"Episode(s) not found: {episode_ids}")


class InvalidRequestStateError(AssignmentServiceError):
    pass


class InvalidEpisodeQualityError(AssignmentServiceError):
    def __init__(self, episode_ids: list[int]):
        self.episode_ids = episode_ids
        super().__init__(f"Episode(s) cannot be assigned because their quality is not good or usable: {episode_ids}")


class EpisodeAlreadyAssignedError(AssignmentServiceError):
    def __init__(self, episode_ids: list[int]):
        self.episode_ids = episode_ids
        super().__init__(f"Episode(s) are already assigned: {episode_ids}")


class DuplicateEpisodeIdsError(AssignmentServiceError):
    pass


class AssignmentConflictError(AssignmentServiceError):
    pass


class AssignmentNotFoundError(AssignmentServiceError):
    pass


class AssignmentRemovalNotAllowedError(AssignmentServiceError):
    pass


@dataclass(frozen=True)
class EpisodePage:
    items: list[Episode]
    total: int


@dataclass(frozen=True)
class AssignmentPage:
    items: list[Assignment]
    total: int


_ALLOWED_REQUEST_STATES = {
    RequestStatus.SUBMITTED,
    RequestStatus.IN_PROGRESS,
    RequestStatus.REJECTED,
}


def list_episodes(
    session: Session,
    page: int,
    page_size: int,
    task_name: str | None,
    quality: EpisodeQuality | None,
    robot_id: str | None,
    exact_task: bool = False,
    unassigned_only: bool = False,
    assignable_only: bool = False,
) -> EpisodePage:
    filters = []
    if task_name:
        normalized_task = "".join(task_name.casefold().split())
        normalized_episode_task = func.lower(Episode.task_name)
        for whitespace in (" ", "\t", "\n", "\r", "\f", "\v"):
            normalized_episode_task = func.replace(normalized_episode_task, whitespace, "")
        filters.append(
            normalized_episode_task == normalized_task
            if exact_task
            else normalized_episode_task.contains(normalized_task)
        )
    if quality is not None:
        filters.append(Episode.quality == quality)
    if robot_id:
        filters.append(Episode.robot_id == robot_id.strip())
    if unassigned_only:
        filters.append(~select(Assignment.id).where(Assignment.episode_id == Episode.id).exists())
    if assignable_only:
        filters.append(Episode.quality.in_((EpisodeQuality.GOOD, EpisodeQuality.USABLE)))

    base_query = select(Episode).where(*filters)
    total = session.scalar(select(func.count()).select_from(base_query.subquery())) or 0
    items = list(
        session.scalars(
            base_query.options(selectinload(Episode.assignment))
            .order_by(Episode.recorded_at.desc().nullslast(), Episode.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return EpisodePage(items=items, total=total)


def list_distinct_task_names(session: Session) -> list[str]:
    values = session.scalars(
        select(Episode.task_name).where(Episode.task_name.is_not(None)).distinct()
    )
    normalized_values = sorted(
        {" ".join(value.split()) for value in values if value and value.strip()},
        key=lambda name: (name.casefold(), name),
    )
    unique_by_normalized_name: dict[str, str] = {}
    for name in normalized_values:
        unique_by_normalized_name.setdefault(" ".join(name.casefold().split()), name)
    return list(unique_by_normalized_name.values())


def get_episode(session: Session, episode_pk: int) -> Episode:
    episode = session.scalar(
        select(Episode).where(Episode.id == episode_pk).options(selectinload(Episode.assignment))
    )
    if episode is None:
        raise EpisodeNotFoundError([episode_pk])
    return episode


def _get_request_for_update(session: Session, request_id: int) -> DatasetRequest:
    request = session.scalar(
        select(DatasetRequest).where(DatasetRequest.id == request_id).with_for_update()
    )
    if request is None:
        raise RequestNotFoundError
    return request


def assign_episodes(
    session: Session,
    request_id: int,
    episode_ids: list[int],
    assigned_by: User,
) -> tuple[DatasetRequest, list[Assignment]]:
    if len(episode_ids) != len(set(episode_ids)):
        raise DuplicateEpisodeIdsError("Duplicate episode IDs are not allowed")

    request = _get_request_for_update(session, request_id)
    request_status = RequestStatus(request.status)
    if request_status not in _ALLOWED_REQUEST_STATES:
        raise InvalidRequestStateError(
            f"Episodes cannot be assigned while request is {request_status.value}"
        )

    episodes = list(
        session.scalars(
            select(Episode)
            .where(Episode.id.in_(episode_ids))
            .with_for_update()
        )
    )
    episodes_by_id = {episode.id: episode for episode in episodes}
    missing_ids = [episode_id for episode_id in episode_ids if episode_id not in episodes_by_id]
    if missing_ids:
        raise EpisodeNotFoundError(missing_ids)

    invalid_quality_ids = [
        episode_id
        for episode_id in episode_ids
        if episodes_by_id[episode_id].quality not in {EpisodeQuality.GOOD, EpisodeQuality.USABLE}
    ]
    if invalid_quality_ids:
        raise InvalidEpisodeQualityError(invalid_quality_ids)

    existing_ids = set(
        session.scalars(
            select(Assignment.episode_id)
            .where(Assignment.episode_id.in_(episode_ids))
            .with_for_update()
        )
    )
    if existing_ids:
        raise EpisodeAlreadyAssignedError(sorted(existing_ids))

    assignments = [
        Assignment(episode_id=episode_id, request_id=request.id, assigned_by=assigned_by.id)
        for episode_id in episode_ids
    ]
    session.add_all(assignments)
    try:
        session.commit()
        session.refresh(request)
    except IntegrityError as error:
        session.rollback()
        raise AssignmentConflictError("One or more episodes were assigned concurrently") from error
    except SQLAlchemyError:
        session.rollback()
        raise
    return request, assignments


def list_assignments(
    session: Session,
    request_id: int,
    page: int,
    page_size: int,
) -> AssignmentPage:
    if session.scalar(select(DatasetRequest.id).where(DatasetRequest.id == request_id)) is None:
        raise RequestNotFoundError
    base_query = select(Assignment).where(Assignment.request_id == request_id)
    total = session.scalar(select(func.count()).select_from(base_query.subquery())) or 0
    items = list(
        session.scalars(
            base_query.options(selectinload(Assignment.episode))
            .order_by(Assignment.assigned_at.asc(), Assignment.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return AssignmentPage(items=items, total=total)


def remove_assignment(session: Session, request_id: int, episode_id: int) -> None:
    request = session.scalar(select(DatasetRequest).where(DatasetRequest.id == request_id))
    if request is None:
        raise RequestNotFoundError
    request_status = RequestStatus(request.status)
    if request_status in {RequestStatus.DELIVERED, RequestStatus.ACCEPTED}:
        raise AssignmentRemovalNotAllowedError(
            f"Assignments cannot be removed while request is {request_status.value}"
        )
    assignment = session.scalar(
        select(Assignment)
        .where(Assignment.request_id == request_id, Assignment.episode_id == episode_id)
        .with_for_update()
    )
    if assignment is None:
        raise AssignmentNotFoundError
    session.delete(assignment)
    try:
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise
