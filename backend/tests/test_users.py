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


def test_only_admins_can_manage_users(client: TestClient, users: dict[UserRole, User]) -> None:
    for role in (UserRole.CLIENT, UserRole.OPERATOR):
        headers = auth_headers(client, users[role])
        assert client.get("/api/users", headers=headers).status_code == 403
        assert client.post(
            "/api/users",
            headers=headers,
            json={"email": "new@example.com", "password": "NewPass123!", "role": "client"},
        ).status_code == 403


def test_admin_can_create_user_and_created_password_is_hashed(
    client: TestClient, users: dict[UserRole, User]
) -> None:
    headers = auth_headers(client, users[UserRole.ADMIN])
    response = client.post(
        "/api/users",
        headers=headers,
        json={
            "email": "new-client@example.com",
            "password": "NewPass123!",
            "role": "client",
            "name": "New Client",
            "organisation": "New Organisation",
        },
    )
    assert response.status_code == 201
    assert response.json()["role"] == "client"
    assert response.json()["name"] == "New Client"
    assert response.json()["organisation"] == "New Organisation"
    assert "password_hash" not in response.json()

    login = client.post(
        "/api/auth/login",
        json={"email": "new-client@example.com", "password": "NewPass123!"},
    )
    assert login.status_code == 200


def test_duplicate_email_is_rejected(client: TestClient, users: dict[UserRole, User]) -> None:
    headers = auth_headers(client, users[UserRole.ADMIN])
    payload = {"email": "duplicate@example.com", "password": "NewPass123!", "role": "client"}
    assert client.post("/api/users", headers=headers, json=payload).status_code == 201
    duplicate = client.post("/api/users", headers=headers, json=payload)
    assert duplicate.status_code == 409


def test_admin_can_change_role_and_deactivate_user(
    client: TestClient, users: dict[UserRole, User]
) -> None:
    headers = auth_headers(client, users[UserRole.ADMIN])
    created = client.post(
        "/api/users",
        headers=headers,
        json={"email": "managed@example.com", "password": "Managed123!", "role": "client"},
    ).json()

    role_response = client.patch(
        f"/api/users/{created['id']}/role",
        headers=headers,
        json={"role": "operator"},
    )
    assert role_response.status_code == 200
    assert role_response.json()["role"] == "operator"

    active_response = client.patch(
        f"/api/users/{created['id']}/active",
        headers=headers,
        json={"is_active": False},
    )
    assert active_response.status_code == 200
    assert active_response.json()["is_active"] is False

    login = client.post(
        "/api/auth/login",
        json={"email": "managed@example.com", "password": "Managed123!"},
    )
    assert login.status_code == 401


def test_admin_user_listing_and_missing_user_errors(
    client: TestClient, users: dict[UserRole, User]
) -> None:
    headers = auth_headers(client, users[UserRole.ADMIN])
    listing = client.get("/api/users", headers=headers)
    assert listing.status_code == 200
    assert {user["email"] for user in listing.json()} == {
        "client@example.com",
        "operator@example.com",
        "admin@example.com",
    }

    missing_role = client.patch(
        "/api/users/9999/role",
        headers=headers,
        json={"role": "client"},
    )
    assert missing_role.status_code == 404


def test_last_active_admin_cannot_be_demoted_or_deactivated(
    client: TestClient, users: dict[UserRole, User]
) -> None:
    headers = auth_headers(client, users[UserRole.ADMIN])
    demote = client.patch(
        f"/api/users/{users[UserRole.ADMIN].id}/role",
        headers=headers,
        json={"role": "operator"},
    )
    deactivate = client.patch(
        f"/api/users/{users[UserRole.ADMIN].id}/active",
        headers=headers,
        json={"is_active": False},
    )
    assert demote.status_code == 409
    assert deactivate.status_code == 409
