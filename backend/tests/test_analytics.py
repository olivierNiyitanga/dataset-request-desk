from datetime import date, datetime, time, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.episode import Episode, EpisodeQuality
from app.models.request import DatasetRequest, RequestStatus
from app.models.request_status_history import RequestStatusHistory
from app.models.user import User, UserRole

PASSWORD = "CorrectPassword123!"


def auth_headers(client: TestClient, user: User) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def add_episode(
    session: Session,
    number: int,
    recorded_at: datetime,
    robot_id: str,
    task_name: str,
    quality: EpisodeQuality,
) -> None:
    session.add(
        Episode(
            episode_id=f"analytics-{number}",
            recorded_at=recorded_at,
            robot_id=robot_id,
            task_name=task_name,
            quality=quality,
            duration_seconds=10,
            operator_name="operator",
        )
    )


def add_request(
    session: Session,
    owner: User,
    number: int,
    status: RequestStatus,
    created_at: datetime,
) -> DatasetRequest:
    request = DatasetRequest(
        client_id=owner.id,
        task_name=f"Request {number}",
        episodes_requested=1,
        deadline=date(2026, 10, 10),
        status=status,
        created_at=created_at,
        updated_at=created_at,
    )
    session.add(request)
    session.flush()
    return request


def add_history(
    session: Session,
    request: DatasetRequest,
    old_status: RequestStatus,
    new_status: RequestStatus,
    changed_at: datetime,
    changed_by: int,
) -> None:
    session.add(
        RequestStatusHistory(
            request_id=request.id,
            old_status=old_status.value,
            new_status=new_status.value,
            changed_at=changed_at,
            changed_by=changed_by,
        )
    )


def test_analytics_authorization_and_date_validation(
    client: TestClient, users: dict[UserRole, User]
) -> None:
    assert client.get("/api/analytics?from_date=2026-09-01&to_date=2026-09-30").status_code == 401
    assert client.get(
        "/api/analytics?from_date=2026-09-01&to_date=2026-09-30",
        headers=auth_headers(client, users[UserRole.CLIENT]),
    ).status_code == 403
    assert client.get(
        "/api/analytics?from_date=bad&to_date=2026-09-30",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    ).status_code == 422
    assert client.get(
        "/api/analytics?from_date=2026-10-01&to_date=2026-09-30",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    ).status_code == 422
    assert client.get(
        "/api/analytics?from_date=2026-09-01",
        headers=auth_headers(client, users[UserRole.ADMIN]),
    ).status_code == 422


def test_episodes_per_day_and_robot_are_aggregated_and_filtered(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    utc = timezone.utc
    add_episode(db_session, 1, datetime(2026, 9, 1, 1, tzinfo=utc), "robot-01", "Pick", EpisodeQuality.GOOD)
    add_episode(db_session, 2, datetime(2026, 9, 1, 2, tzinfo=utc), "robot-01", "Pick", EpisodeQuality.BAD)
    add_episode(db_session, 3, datetime(2026, 9, 1, 3, tzinfo=utc), "robot-02", "Pick", EpisodeQuality.USABLE)
    add_episode(db_session, 4, datetime(2026, 10, 1, 1, tzinfo=utc), "robot-01", "Pick", EpisodeQuality.GOOD)
    db_session.commit()
    response = client.get(
        "/api/analytics?from_date=2026-09-01&to_date=2026-09-30",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )
    assert response.status_code == 200
    assert response.json()["episodes_per_day_per_robot"] == [
        {"date": "2026-09-01", "robot_id": "robot-01", "count": 2},
        {"date": "2026-09-01", "robot_id": "robot-02", "count": 1},
    ]


def test_request_status_counts_use_created_at_and_include_zero_statuses(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    statuses = list(RequestStatus)
    for index, request_status in enumerate(statuses):
        add_request(
            db_session,
            users[UserRole.CLIENT],
            index,
            request_status,
            datetime(2026, 9, 10, 12, tzinfo=timezone.utc),
        )
    add_request(
        db_session,
        users[UserRole.CLIENT],
        99,
        RequestStatus.SUBMITTED,
        datetime(2026, 10, 1, 12, tzinfo=timezone.utc),
    )
    db_session.commit()
    response = client.get(
        "/api/analytics?from_date=2026-09-01&to_date=2026-09-30",
        headers=auth_headers(client, users[UserRole.ADMIN]),
    )
    counts = {item["status"]: item["count"] for item in response.json()["requests_by_status"]}
    assert counts == {request_status.value: 1 for request_status in statuses}


def test_median_uses_status_history_in_database(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    start = datetime(2026, 9, 10, 10, tzinfo=timezone.utc)
    durations = [timedelta(hours=2), timedelta(hours=4), timedelta(hours=10)]
    for index, duration in enumerate(durations):
        request = add_request(
            db_session,
            users[UserRole.CLIENT],
            index,
            RequestStatus.DELIVERED,
            start,
        )
        add_history(db_session, request, RequestStatus.SUBMITTED, RequestStatus.SUBMITTED, start, users[UserRole.CLIENT].id)
        add_history(db_session, request, RequestStatus.IN_PROGRESS, RequestStatus.DELIVERED, start + duration, users[UserRole.OPERATOR].id)
    db_session.commit()
    response = client.get(
        "/api/analytics?from_date=2026-09-01&to_date=2026-09-30",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )
    assert response.json()["median_submitted_to_delivered_seconds"] == pytest.approx(4 * 60 * 60, abs=0.01)


def test_top_five_good_tasks_and_empty_median(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    for number, (task, quality) in enumerate(
        [("Pick and Place", EpisodeQuality.GOOD)] * 3
        + [("Sorting", EpisodeQuality.GOOD)] * 2
        + [("Navigation", EpisodeQuality.GOOD)]
        + [("Bad Task", EpisodeQuality.BAD)]
    ):
        add_episode(
            db_session,
            number,
            datetime(2026, 9, 15, tzinfo=timezone.utc),
            "robot-01",
            task,
            quality,
        )
    for offset in range(6):
        add_episode(
            db_session,
            100 + offset,
            datetime(2026, 9, 15, tzinfo=timezone.utc),
            "robot-01",
            f"Task {offset}",
            EpisodeQuality.GOOD,
        )
    db_session.commit()
    response = client.get(
        "/api/analytics?from_date=2026-09-01&to_date=2026-09-30",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )
    top_tasks = response.json()["top_good_tasks"]
    assert len(top_tasks) == 5
    assert top_tasks[0] == {"task_name": "Pick and Place", "count": 3}
    assert all(item["task_name"] != "Bad Task" for item in top_tasks)
    assert response.json()["median_submitted_to_delivered_seconds"] is None


def test_empty_analytics_response(client: TestClient, users: dict[UserRole, User]) -> None:
    response = client.get(
        "/api/analytics?from_date=2020-01-01&to_date=2020-01-02",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["episodes_per_day_per_robot"] == []
    assert body["top_good_tasks"] == []
    assert body["median_submitted_to_delivered_seconds"] is None
    assert all(item["count"] == 0 for item in body["requests_by_status"])
