import json
import logging

from fastapi.testclient import TestClient

from app.models.user import User, UserRole

PASSWORD = "CorrectPassword123!"


def auth_headers(client: TestClient, user: User) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def request_events(caplog) -> list[dict]:
    return [
        json.loads(record.getMessage())
        for record in caplog.records
        if record.name == "dataset_request_desk.requests"
    ]


def test_health_is_public_and_reports_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unauthenticated_request_logs_required_fields(client: TestClient, caplog) -> None:
    caplog.set_level(logging.INFO, logger="dataset_request_desk.requests")
    response = client.get("/health")
    events = request_events(caplog)
    assert response.status_code == 200
    assert len(events) == 1
    assert events[0]["method"] == "GET"
    assert events[0]["path"] == "/health"
    assert events[0]["status"] == 200
    assert events[0]["user_id"] is None
    assert events[0]["duration_ms"] >= 0


def test_authenticated_request_logs_user_id(client: TestClient, users: dict[UserRole, User], caplog) -> None:
    caplog.set_level(logging.INFO, logger="dataset_request_desk.requests")
    response = client.get("/api/auth/me", headers=auth_headers(client, users[UserRole.CLIENT]))
    events = request_events(caplog)
    assert response.status_code == 200
    assert events[-1]["method"] == "GET"
    assert events[-1]["path"] == "/api/auth/me"
    assert events[-1]["status"] == 200
    assert events[-1]["user_id"] == users[UserRole.CLIENT].id
    assert events[-1]["duration_ms"] >= 0


def test_failed_request_is_logged_without_credentials(client: TestClient, caplog) -> None:
    caplog.set_level(logging.INFO, logger="dataset_request_desk.requests")
    response = client.get("/api/does-not-exist")
    events = request_events(caplog)
    assert response.status_code == 404
    assert events[-1]["status"] == 404
    assert events[-1]["user_id"] is None


def test_login_log_does_not_contain_password_or_token(
    client: TestClient, users: dict[UserRole, User], caplog
) -> None:
    caplog.set_level(logging.INFO, logger="dataset_request_desk.requests")
    response = client.post(
        "/api/auth/login",
        json={"email": users[UserRole.CLIENT].email, "password": PASSWORD},
    )
    assert response.status_code == 200
    messages = [record.getMessage() for record in caplog.records]
    assert all(PASSWORD not in message for message in messages)
    assert all(response.json()["access_token"] not in message for message in messages)
    assert all("Authorization" not in message for message in messages)
