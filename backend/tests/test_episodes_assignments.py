from datetime import date, datetime, timezone
from urllib.parse import quote

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.episode import Episode, EpisodeQuality
from app.models.request import DatasetRequest, RequestStatus
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
    quality: EpisodeQuality = EpisodeQuality.GOOD,
    task_name: str = "Pick and Place",
    robot_id: str = "robot-001",
) -> Episode:
    episode = Episode(
        episode_id=f"external-{number}",
        robot_id=robot_id,
        task_name=task_name,
        recorded_at=datetime(2026, 10, 1, tzinfo=timezone.utc),
        duration_seconds=10,
        operator_name="operator",
        quality=quality,
    )
    session.add(episode)
    session.commit()
    session.refresh(episode)
    return episode


def add_request(session: Session, owner: User, status: RequestStatus = RequestStatus.IN_PROGRESS) -> DatasetRequest:
    request = DatasetRequest(
        client_id=owner.id,
        task_name="Pick and Place",
        episodes_requested=1,
        deadline=date(2026, 10, 10),
        status=status,
    )
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


def test_episode_listing_filters_and_client_forbidden(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    add_episode(db_session, 1, EpisodeQuality.GOOD)
    add_episode(db_session, 2, EpisodeQuality.BAD, task_name="Stack Blocks", robot_id="robot-002")
    headers = auth_headers(client, users[UserRole.OPERATOR])
    response = client.get(
        "/api/episodes?task_name=Pick&quality=good&robot_id=robot-001&page=1&page_size=1",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["quality"] == "good"
    assert client.get(
        "/api/episodes", headers=auth_headers(client, users[UserRole.CLIENT])
    ).status_code == 403


def test_pick_cup_task_filter_ignores_case_and_extra_spaces(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    matching_spaced = add_episode(db_session, 12, EpisodeQuality.USABLE, task_name="  PICK   CUP  ")
    matching_case = add_episode(db_session, 13, task_name="pick cup")
    matching_bad = add_episode(db_session, 15, EpisodeQuality.BAD, task_name="Pick   Cup")
    add_episode(db_session, 14, task_name="pick up cup")
    request = add_request(db_session, users[UserRole.CLIENT], RequestStatus.SUBMITTED)
    request.task_name = " pick   cup "
    request.episodes_requested = 5
    db_session.commit()

    response = client.get(
        f"/api/episodes?task={quote(request.task_name)}&page=1&page_size=100",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )

    assert response.status_code == 200
    assert {episode["id"] for episode in response.json()["items"]} == {
        matching_spaced.id,
        matching_case.id,
        matching_bad.id,
    }

    headers = auth_headers(client, users[UserRole.OPERATOR])
    assignment = client.post(
        f"/api/requests/{request.id}/assignments",
        headers=headers,
        json={"episode_ids": [matching_spaced.id, matching_case.id]},
    )
    assert assignment.status_code == 201
    assert assignment.json()["assigned_count"] == 2

    bad_assignment = client.post(
        f"/api/requests/{request.id}/assignments",
        headers=headers,
        json={"episode_ids": [matching_bad.id]},
    )
    assert bad_assignment.status_code == 422


def test_episode_task_names_are_distinct_normalized_and_sorted(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    add_episode(db_session, 20, task_name=" Stack Blocks ")
    add_episode(db_session, 21, task_name="pick   cup")
    add_episode(db_session, 22, task_name="Pick Cup")
    add_episode(db_session, 23, task_name="\tPICK CUP\n")
    add_episode(db_session, 24, task_name=" ")

    response = client.get(
        "/api/episodes/tasks", headers=auth_headers(client, users[UserRole.CLIENT])
    )

    assert response.status_code == 200
    assert response.json() == ["PICK CUP", "Stack Blocks"]


def test_assignable_episode_filter_excludes_bad_quality(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    good = add_episode(db_session, 25, EpisodeQuality.GOOD, task_name="pick cup")
    usable = add_episode(db_session, 26, EpisodeQuality.USABLE, task_name="PICK   CUP")
    add_episode(db_session, 27, EpisodeQuality.BAD, task_name="Pick Cup")

    response = client.get(
        "/api/episodes?task=Pick%20Cup&assignable_only=true&page=1&page_size=100",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert {episode["id"] for episode in response.json()["items"]} == {good.id, usable.id}


def test_episode_pages_count_only_matching_unassigned_results(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    assigned = add_episode(db_session, 16, task_name="Pick Cup")
    remaining = [
        add_episode(db_session, 17, EpisodeQuality.GOOD, task_name="pick   cup"),
        add_episode(db_session, 18, EpisodeQuality.USABLE, task_name="PICK CUP"),
    ]
    request = add_request(db_session, users[UserRole.CLIENT], RequestStatus.SUBMITTED)
    db_session.add(Assignment(episode_id=assigned.id, request_id=request.id, assigned_by=users[UserRole.OPERATOR].id))
    db_session.commit()
    headers = auth_headers(client, users[UserRole.OPERATOR])

    first_page = client.get(
        "/api/episodes?task=pick%20cup&unassigned_only=true&page=1&page_size=1",
        headers=headers,
    )
    second_page = client.get(
        "/api/episodes?task=pick%20cup&unassigned_only=true&page=2&page_size=1",
        headers=headers,
    )

    assert first_page.status_code == second_page.status_code == 200
    assert first_page.json()["total"] == second_page.json()["total"] == 2
    assert first_page.json()["pages"] == second_page.json()["pages"] == 2
    assert {first_page.json()["items"][0]["id"], second_page.json()["items"][0]["id"]} == {
        episode.id for episode in remaining
    }


def test_episode_details_include_assignment_information(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    episode = add_episode(db_session, 3, EpisodeQuality.USABLE)
    request = add_request(db_session, users[UserRole.CLIENT])
    assignment = Assignment(episode_id=episode.id, request_id=request.id, assigned_by=users[UserRole.OPERATOR].id)
    db_session.add(assignment)
    db_session.commit()
    response = client.get(
        f"/api/episodes/{episode.id}", headers=auth_headers(client, users[UserRole.ADMIN])
    )
    assert response.status_code == 200
    assert response.json()["assignment"]["request_id"] == request.id


def test_good_and_usable_episodes_can_be_assigned(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    good = add_episode(db_session, 4, EpisodeQuality.GOOD)
    usable = add_episode(db_session, 5, EpisodeQuality.USABLE)
    request = add_request(db_session, users[UserRole.CLIENT])
    response = client.post(
        f"/api/requests/{request.id}/assignments",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
        json={"episode_ids": [good.id, usable.id]},
    )
    assert response.status_code == 201
    assert response.json()["assigned_count"] == 2
    assert response.json()["assigned_episode_ids"] == [good.id, usable.id]
    assert response.json()["episodes_requested"] == request.episodes_requested


def test_bad_missing_duplicate_and_already_assigned_episodes_are_rejected_atomically(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    good = add_episode(db_session, 6, EpisodeQuality.GOOD)
    bad = add_episode(db_session, 7, EpisodeQuality.BAD)
    request = add_request(db_session, users[UserRole.CLIENT])
    headers = auth_headers(client, users[UserRole.OPERATOR])
    response = client.post(
        f"/api/requests/{request.id}/assignments", headers=headers, json={"episode_ids": [good.id, bad.id]}
    )
    assert response.status_code == 422
    assert db_session.scalars(select(Assignment)).all() == []
    duplicate_response = client.post(
        f"/api/requests/{request.id}/assignments", headers=headers, json={"episode_ids": [good.id, good.id]}
    )
    assert duplicate_response.status_code == 422
    db_session.add(Assignment(episode_id=good.id, request_id=request.id, assigned_by=users[UserRole.OPERATOR].id))
    db_session.commit()
    already_assigned = client.post(
        f"/api/requests/{request.id}/assignments", headers=headers, json={"episode_ids": [good.id]}
    )
    assert already_assigned.status_code == 409

    missing = client.post(
        f"/api/requests/{request.id}/assignments", headers=headers, json={"episode_ids": [99999]}
    )
    assert missing.status_code == 404


def test_assignment_requires_operator_or_admin_and_operational_request(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    episode = add_episode(db_session, 8)
    submitted = add_request(db_session, users[UserRole.CLIENT], RequestStatus.SUBMITTED)
    client_response = client.post(
        f"/api/requests/{submitted.id}/assignments",
        headers=auth_headers(client, users[UserRole.CLIENT]),
        json={"episode_ids": [episode.id]},
    )
    assert client_response.status_code == 403
    delivered = add_request(db_session, users[UserRole.CLIENT], RequestStatus.DELIVERED)
    delivered_response = client.post(
        f"/api/requests/{delivered.id}/assignments",
        headers=auth_headers(client, users[UserRole.ADMIN]),
        json={"episode_ids": [episode.id]},
    )
    assert delivered_response.status_code == 409


def test_assignment_listing_and_safe_removal(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    episode = add_episode(db_session, 9)
    request = add_request(db_session, users[UserRole.CLIENT], RequestStatus.REJECTED)
    db_session.add(Assignment(episode_id=episode.id, request_id=request.id, assigned_by=users[UserRole.ADMIN].id))
    db_session.commit()
    headers = auth_headers(client, users[UserRole.ADMIN])
    listing = client.get(f"/api/requests/{request.id}/assignments", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["items"][0]["episode"]["episode_id"] == episode.episode_id
    removed = client.delete(f"/api/requests/{request.id}/assignments/{episode.id}", headers=headers)
    assert removed.status_code == 204
    assert db_session.scalars(select(Assignment)).all() == []


def test_assignment_removal_is_blocked_after_delivery(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    episode = add_episode(db_session, 10)
    request = add_request(db_session, users[UserRole.CLIENT], RequestStatus.DELIVERED)
    db_session.add(Assignment(episode_id=episode.id, request_id=request.id, assigned_by=users[UserRole.OPERATOR].id))
    db_session.commit()
    response = client.delete(
        f"/api/requests/{request.id}/assignments/{episode.id}",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )
    assert response.status_code == 409


def test_assignment_sets_authenticated_user_as_assigner(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    episode = add_episode(db_session, 11)
    request = add_request(db_session, users[UserRole.CLIENT])
    response = client.post(
        f"/api/requests/{request.id}/assignments",
        headers=auth_headers(client, users[UserRole.ADMIN]),
        json={"episode_ids": [episode.id], "assigned_by": users[UserRole.OPERATOR].id},
    )
    assert response.status_code == 201
    assignment = db_session.scalar(select(Assignment).where(Assignment.episode_id == episode.id))
    assert assignment.assigned_by == users[UserRole.ADMIN].id
