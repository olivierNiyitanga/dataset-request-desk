from fastapi.testclient import TestClient

from app.models.user import User, UserRole


def auth_headers(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": "CorrectPassword123!"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_client_role_access(client: TestClient, users: dict[UserRole, User]) -> None:
    headers = auth_headers(client, users[UserRole.CLIENT].email)
    assert client.get("/api/auth/role-check/client", headers=headers).status_code == 200
    assert client.get("/api/auth/role-check/operator", headers=headers).status_code == 403
    assert client.get("/api/auth/role-check/admin", headers=headers).status_code == 403
    assert client.get("/api/auth/role-check/operator-or-admin", headers=headers).status_code == 403


def test_operator_role_access(client: TestClient, users: dict[UserRole, User]) -> None:
    headers = auth_headers(client, users[UserRole.OPERATOR].email)
    assert client.get("/api/auth/role-check/client", headers=headers).status_code == 403
    assert client.get("/api/auth/role-check/operator", headers=headers).status_code == 200
    assert client.get("/api/auth/role-check/admin", headers=headers).status_code == 403
    assert client.get("/api/auth/role-check/operator-or-admin", headers=headers).status_code == 200


def test_admin_role_access(client: TestClient, users: dict[UserRole, User]) -> None:
    headers = auth_headers(client, users[UserRole.ADMIN].email)
    assert client.get("/api/auth/role-check/client", headers=headers).status_code == 403
    assert client.get("/api/auth/role-check/operator", headers=headers).status_code == 200
    assert client.get("/api/auth/role-check/admin", headers=headers).status_code == 200
    assert client.get("/api/auth/role-check/operator-or-admin", headers=headers).status_code == 200
