from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User, UserRole
from app.utils.security import create_access_token, hash_password

PASSWORD = "CorrectPassword123!"


def login(client: TestClient, email: str, password: str = PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_login_succeeds_for_each_role(client: TestClient, users: dict[UserRole, User]) -> None:
    for role in UserRole:
        response = login(client, users[role].email)
        assert response.status_code == 200
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["user"]["role"] == role.value
        assert "password_hash" not in body["user"]


def test_invalid_login_is_generic(client: TestClient, users: dict[UserRole, User]) -> None:
    wrong_password = login(client, users[UserRole.CLIENT].email, "wrong-password")
    unknown_email = login(client, "unknown@example.com")
    assert wrong_password.status_code == 401
    assert unknown_email.status_code == 401
    assert wrong_password.json()["detail"] == "Invalid email or password"
    assert unknown_email.json()["detail"] == wrong_password.json()["detail"]


def test_inactive_user_cannot_login(client: TestClient, db_session: Session) -> None:
    user = User(
        email="inactive@example.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.CLIENT,
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()
    response = login(client, user.email)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_missing_credentials_fail(client: TestClient) -> None:
    assert client.post("/api/auth/login", json={}).status_code == 422


def test_me_rejects_missing_and_malformed_tokens(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer malformed"}).status_code == 401


def test_me_rejects_expired_and_unknown_user_tokens(client: TestClient, users: dict[UserRole, User]) -> None:
    expired = jwt.encode(
        {"sub": str(users[UserRole.CLIENT].id), "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    unknown = create_access_token(9999)
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {unknown}"}).status_code == 401


def test_me_rejects_token_for_inactive_user(client: TestClient, db_session: Session) -> None:
    user = User(
        email="inactive-token@example.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.CLIENT,
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(user.id)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
