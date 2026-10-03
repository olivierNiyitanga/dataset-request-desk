from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import Session

from app.models.episode import Episode, EpisodeQuality
from app.models.request import DatasetRequest, RequestStatus
from app.models.request_status_history import RequestStatusHistory
from app.schemas.analytics import (
    AnalyticsDateRange,
    AnalyticsResponse,
    EpisodesPerDayPerRobot,
    RequestStatusCount,
    TopGoodTask,
)


def _range_bounds(from_date: date, to_date: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(from_date, time.min, tzinfo=timezone.utc),
        datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=timezone.utc),
    )


def get_episodes_per_day_per_robot(
    session: Session,
    from_date: date,
    to_date: date,
) -> list[EpisodesPerDayPerRobot]:
    start, end = _range_bounds(from_date, to_date)
    recorded_date = func.date(Episode.recorded_at).label("recorded_date")
    rows = session.execute(
        select(recorded_date, Episode.robot_id, func.count(Episode.id).label("count"))
        .where(
            Episode.recorded_at >= start,
            Episode.recorded_at < end,
        )
        .group_by(recorded_date, Episode.robot_id)
        .order_by(recorded_date.asc(), Episode.robot_id.asc())
    )
    return [
        EpisodesPerDayPerRobot(date=row.recorded_date, robot_id=row.robot_id, count=row.count)
        for row in rows
    ]


def get_request_status_counts(
    session: Session,
    from_date: date,
    to_date: date,
) -> list[RequestStatusCount]:
    start, end = _range_bounds(from_date, to_date)
    rows = session.execute(
        select(DatasetRequest.status, func.count(DatasetRequest.id).label("count"))
        .where(DatasetRequest.created_at >= start, DatasetRequest.created_at < end)
        .group_by(DatasetRequest.status)
    )
    counts = {RequestStatus(row.status): row.count for row in rows}
    return [
        RequestStatusCount(status=request_status, count=counts.get(request_status, 0))
        for request_status in RequestStatus
    ]


def _lifecycle_query(session: Session, from_date: date, to_date: date):
    start, end = _range_bounds(from_date, to_date)
    submitted = (
        select(
            RequestStatusHistory.request_id,
            func.min(RequestStatusHistory.changed_at).label("submitted_at"),
        )
        .where(RequestStatusHistory.new_status == RequestStatus.SUBMITTED.value)
        .group_by(RequestStatusHistory.request_id)
        .subquery("submitted_events")
    )
    delivered = (
        select(
            RequestStatusHistory.request_id,
            func.min(RequestStatusHistory.changed_at).label("delivered_at"),
        )
        .where(RequestStatusHistory.new_status == RequestStatus.DELIVERED.value)
        .group_by(RequestStatusHistory.request_id)
        .subquery("delivered_events")
    )
    return (
        select(submitted.c.submitted_at, delivered.c.delivered_at)
        .join(delivered, delivered.c.request_id == submitted.c.request_id)
        .where(
            delivered.c.delivered_at >= start,
            delivered.c.delivered_at < end,
            delivered.c.delivered_at >= submitted.c.submitted_at,
        )
        .subquery("request_lifecycles")
    )


def get_median_fulfillment_time(
    session: Session,
    from_date: date,
    to_date: date,
) -> float | None:
    lifecycle = _lifecycle_query(session, from_date, to_date)
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        duration_seconds = func.extract(
            "epoch", lifecycle.c.delivered_at - lifecycle.c.submitted_at
        )
        value = session.scalar(
            select(func.percentile_cont(0.5).within_group(duration_seconds))
        )
    else:
        # SQLite has no percentile_cont; this fallback still computes the median in SQL.
        duration_seconds = (
            (func.julianday(lifecycle.c.delivered_at) - func.julianday(lifecycle.c.submitted_at))
            * 86400.0
        ).label("duration_seconds")
        ranked = select(
            duration_seconds,
            func.row_number().over(order_by=duration_seconds).label("row_number"),
            func.count().over().label("row_count"),
        ).subquery("ranked_lifecycles")
        value = session.scalar(
            select(func.avg(ranked.c.duration_seconds)).where(
                ranked.c.row_number >= cast((ranked.c.row_count + 1) / 2, Integer),
                ranked.c.row_number <= cast((ranked.c.row_count + 2) / 2, Integer),
            )
        )
    return None if value is None else float(value)


def get_top_good_tasks(
    session: Session,
    from_date: date,
    to_date: date,
) -> list[TopGoodTask]:
    start, end = _range_bounds(from_date, to_date)
    rows = session.execute(
        select(Episode.task_name, func.count(Episode.id).label("count"))
        .where(
            Episode.quality == EpisodeQuality.GOOD,
            Episode.task_name.is_not(None),
            Episode.recorded_at >= start,
            Episode.recorded_at < end,
        )
        .group_by(Episode.task_name)
        .order_by(func.count(Episode.id).desc(), Episode.task_name.asc())
        .limit(5)
    )
    return [TopGoodTask(task_name=row.task_name, count=row.count) for row in rows]


def get_analytics(session: Session, from_date: date, to_date: date) -> AnalyticsResponse:
    return AnalyticsResponse(
        date_range=AnalyticsDateRange(from_date=from_date, to_date=to_date),
        episodes_per_day_per_robot=get_episodes_per_day_per_robot(session, from_date, to_date),
        requests_by_status=get_request_status_counts(session, from_date, to_date),
        median_submitted_to_delivered_seconds=get_median_fulfillment_time(session, from_date, to_date),
        top_good_tasks=get_top_good_tasks(session, from_date, to_date),
    )
