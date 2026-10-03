from datetime import date

from pydantic import BaseModel

from app.models.request import RequestStatus


class AnalyticsDateRange(BaseModel):
    from_date: date
    to_date: date


class EpisodesPerDayPerRobot(BaseModel):
    date: date
    robot_id: str | None
    count: int


class RequestStatusCount(BaseModel):
    status: RequestStatus
    count: int


class TopGoodTask(BaseModel):
    task_name: str
    count: int


class AnalyticsResponse(BaseModel):
    date_range: AnalyticsDateRange
    episodes_per_day_per_robot: list[EpisodesPerDayPerRobot]
    requests_by_status: list[RequestStatusCount]
    median_submitted_to_delivered_seconds: float | None
    top_good_tasks: list[TopGoodTask]
