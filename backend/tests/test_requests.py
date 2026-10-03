from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.episode import Episode, EpisodeQuality
from app.models.request import DatasetRequest, RequestStatus
from app.models.request_status_history import RequestStatusHistory
from app.models.user import User, UserRole
from app.services.request_service import transition_request

PASSWORD = "CorrectPassword123!"


def auth_headers(client: TestClient, user: User) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_request(client: TestClient, user: User, episodes_requested: int = 1) -> dict:
    response = client.post(
        "/api/requests",
        headers=auth_headers(client, user),
        json={
            "task_name": "Pick and Place",
            "episodes_requested": episodes_requested,
            "deadline": "2026-10-10",
            "notes": "Robot arm should pick cups.",
        },
    )
    assert response.status_code == 201
    return response.json()


def persist_request(
    session: Session,
    user: User,
    status: RequestStatus = RequestStatus.SUBMITTED,
    episodes_requested: int = 1,
) -> DatasetRequest:
    request = DatasetRequest(
        client_id=user.id,
        task_name="Pick and Place",
        episodes_requested=episodes_requested,
        deadline=date(2026, 10, 10),
        status=status,
    )
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


def assign_episode(session: Session, request: DatasetRequest, operator: User) -> None:
    episode = Episode(
        episode_id=f"episode-for-request-{request.id}",
        quality=EpisodeQuality.GOOD,
    )
    session.add(episode)
    session.flush()
    session.add(Assignment(episode_id=episode.id, request_id=request.id, assigned_by=operator.id))
    session.commit()


def test_client_can_create_request_and_client_id_is_derived(
    client: TestClient, users: dict[UserRole, User]
) -> None:
    response = client.post(
        "/api/requests",
        headers=auth_headers(client, users[UserRole.CLIENT]),
        json={
            "client_id": users[UserRole.OPERATOR].id,
            "task_name": "Pick and Place",
            "episodes_requested": 2,
            "deadline": "2026-10-10",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["client"]["id"] == users[UserRole.CLIENT].id
    assert body["status"] == "submitted"


def test_only_clients_can_create_requests(client: TestClient, users: dict[UserRole, User]) -> None:
    for role in (UserRole.OPERATOR, UserRole.ADMIN):
        response = client.post(
            "/api/requests",
            headers=auth_headers(client, users[role]),
            json={
                "task_name": "Pick and Place",
                "episodes_requested": 1,
                "deadline": "2026-10-10",
            },
        )
        assert response.status_code == 403


def test_request_validation(client: TestClient, users: dict[UserRole, User]) -> None:
    headers = auth_headers(client, users[UserRole.CLIENT])
    response = client.post(
        "/api/requests",
        headers=headers,
        json={"task_name": " ", "episodes_requested": 0, "deadline": "not-a-date"},
    )
    assert response.status_code == 422


def test_request_visibility_by_role(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    own = persist_request(db_session, users[UserRole.CLIENT])
    other = DatasetRequest(
        client_id=users[UserRole.OPERATOR].id,
        task_name="Other task",
        episodes_requested=1,
        deadline=date(2026, 10, 10),
    )
    db_session.add(other)
    db_session.commit()

    client_response = client.get("/api/requests", headers=auth_headers(client, users[UserRole.CLIENT]))
    operator_response = client.get("/api/requests", headers=auth_headers(client, users[UserRole.OPERATOR]))
    assert client_response.status_code == 200
    assert [item["id"] for item in client_response.json()["items"]] == [own.id]
    assert operator_response.status_code == 200
    assert {item["id"] for item in operator_response.json()["items"]} == {own.id, other.id}
    assert client.get(f"/api/requests/{other.id}", headers=auth_headers(client, users[UserRole.CLIENT])).status_code == 404


def test_request_pagination_and_filters(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    for index in range(3):
        request = persist_request(db_session, users[UserRole.CLIENT])
        request.task_name = f"Task {index}"
        if index == 1:
            request.status = RequestStatus.IN_PROGRESS
    db_session.commit()
    response = client.get(
        "/api/requests?page=1&page_size=1&status=in_progress&task_name=Task 1",
        headers=auth_headers(client, users[UserRole.OPERATOR]),
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["page_size"] == 1


def test_valid_operator_workflow_and_history(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    request = persist_request(db_session, users[UserRole.CLIENT])
    headers = auth_headers(client, users[UserRole.OPERATOR])
    response = client.patch(
        f"/api/requests/{request.id}/status", headers=headers, json={"status": "in_progress"}
    )
    assert response.status_code == 200
    assign_episode(db_session, request, users[UserRole.OPERATOR])
    response = client.patch(
        f"/api/requests/{request.id}/status", headers=headers, json={"status": "delivered"}
    )
    assert response.status_code == 200
    history = db_session.scalars(
        select(RequestStatusHistory).where(RequestStatusHistory.request_id == request.id).order_by(RequestStatusHistory.id)
    ).all()
    assert [(item.old_status, item.new_status, item.changed_by) for item in history] == [
        ("submitted", "in_progress", users[UserRole.OPERATOR].id),
        ("in_progress", "delivered", users[UserRole.OPERATOR].id),
    ]


def test_delivery_requires_enough_assigned_episodes(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    request = persist_request(db_session, users[UserRole.CLIENT], episodes_requested=2)
    operator_headers = auth_headers(client, users[UserRole.OPERATOR])
    client.patch(
        f"/api/requests/{request.id}/status", headers=operator_headers, json={"status": "in_progress"}
    )
    response = client.patch(
        f"/api/requests/{request.id}/status", headers=operator_headers, json={"status": "delivered"}
    )
    assert response.status_code == 409
    assert db_session.scalar(select(func.count()).select_from(RequestStatusHistory).where(RequestStatusHistory.request_id == request.id)) == 1


def test_invalid_transitions_and_role_restrictions(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    request = persist_request(db_session, users[UserRole.CLIENT])
    operator_headers = auth_headers(client, users[UserRole.OPERATOR])
    response = client.patch(
        f"/api/requests/{request.id}/status", headers=operator_headers, json={"status": "delivered"}
    )
    assert response.status_code == 409
    client_response = client.patch(
        f"/api/requests/{request.id}/status",
        headers=auth_headers(client, users[UserRole.CLIENT]),
        json={"status": "in_progress"},
    )
    assert client_response.status_code == 403


def test_client_accepts_only_owned_delivered_request(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    request = persist_request(db_session, users[UserRole.CLIENT], RequestStatus.DELIVERED)
    other = persist_request(db_session, users[UserRole.OPERATOR], RequestStatus.DELIVERED)
    response = client.post(
        f"/api/requests/{request.id}/accept", headers=auth_headers(client, users[UserRole.CLIENT])
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    assert client.post(
        f"/api/requests/{other.id}/accept", headers=auth_headers(client, users[UserRole.CLIENT])
    ).status_code == 404
    assert client.post(
        f"/api/requests/{request.id}/accept", headers=auth_headers(client, users[UserRole.OPERATOR])
    ).status_code == 403


def test_rejection_requires_reason_and_records_history(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    request = persist_request(db_session, users[UserRole.CLIENT], RequestStatus.DELIVERED)
    headers = auth_headers(client, users[UserRole.CLIENT])
    assert client.post(f"/api/requests/{request.id}/reject", headers=headers, json={}).status_code == 422
    assert client.post(
        f"/api/requests/{request.id}/reject", headers=headers, json={"reason": "  "}
    ).status_code == 422
    response = client.post(
        f"/api/requests/{request.id}/reject",
        headers=headers,
        json={"reason": "Several episodes contain incorrect objects."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert response.json()["rejection_reason"] == "Several episodes contain incorrect objects."
    history = db_session.scalars(
        select(RequestStatusHistory).where(RequestStatusHistory.request_id == request.id)
    ).all()
    assert len(history) == 1
    assert history[0].old_status == "delivered"
    assert history[0].new_status == "rejected"
    assert history[0].changed_by == users[UserRole.CLIENT].id


def test_admin_can_perform_operator_transitions_but_not_client_delivery_decisions(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    request = persist_request(db_session, users[UserRole.CLIENT])
    admin_headers = auth_headers(client, users[UserRole.ADMIN])
    assert client.patch(
        f"/api/requests/{request.id}/status", headers=admin_headers, json={"status": "in_progress"}
    ).status_code == 200
    assign_episode(db_session, request, users[UserRole.ADMIN])
    assert client.patch(
        f"/api/requests/{request.id}/status", headers=admin_headers, json={"status": "delivered"}
    ).status_code == 200
    assert client.post(f"/api/requests/{request.id}/accept", headers=admin_headers).status_code == 403
    assert client.post(
        f"/api/requests/{request.id}/reject", headers=admin_headers, json={"reason": "not allowed"}
    ).status_code == 403


def test_request_and_history_roll_back_together_when_history_insert_fails(
    db_session: Session, users: dict[UserRole, User]
) -> None:
    request = persist_request(db_session, users[UserRole.CLIENT])

    def fail_history_insert(mapper, connection, target) -> None:
        raise IntegrityError("forced history failure", {}, Exception("forced"))

    event.listen(RequestStatusHistory, "before_insert", fail_history_insert)
    try:
        with pytest.raises(IntegrityError):
            transition_request(
                db_session,
                request.id,
                users[UserRole.OPERATOR],
                RequestStatus.IN_PROGRESS,
            )
    finally:
        event.remove(RequestStatusHistory, "before_insert", fail_history_insert)

    db_session.expire_all()
    assert db_session.get(DatasetRequest, request.id).status == RequestStatus.SUBMITTED
    assert db_session.scalar(
        select(func.count()).select_from(RequestStatusHistory).where(RequestStatusHistory.request_id == request.id)
    ) == 0
