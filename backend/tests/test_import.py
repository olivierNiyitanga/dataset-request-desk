from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.episode import Episode, EpisodeQuality
from app.models.user import User, UserRole

PASSWORD = "CorrectPassword123!"
HEADER = "episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality\n"


def auth_headers(client: TestClient, user: User) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def upload(client: TestClient, user: User, csv_text: str):
    return client.post(
        "/api/episodes/import",
        headers=auth_headers(client, user),
        files={"file": ("episodes.csv", BytesIO(csv_text.encode()), "text/csv")},
    )


def row(episode_id: str, quality: str = "good", duration: str = "12", recorded_at: str = "2026-09-28T10:00:00") -> str:
    return f"{episode_id},arm-01,Pick and Place,{recorded_at},{duration},Operator,{quality}\n"


def test_import_authorization(client: TestClient, users: dict[UserRole, User]) -> None:
    csv_text = HEADER + row("EP-001")
    assert upload(client, users[UserRole.CLIENT], csv_text).status_code == 403
    assert upload(client, users[UserRole.OPERATOR], csv_text).status_code == 200
    assert upload(client, users[UserRole.ADMIN], csv_text).status_code == 200


def test_valid_import_and_idempotency(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    csv_text = HEADER + row("EP-010") + row("EP-011", "usable")
    first = upload(client, users[UserRole.OPERATOR], csv_text)
    second = upload(client, users[UserRole.OPERATOR], csv_text)
    assert first.status_code == 200
    assert first.json()["imported"] == 2
    assert second.json()["imported"] == 0
    assert second.json()["summary"]["duplicate_episode_id"] == 2
    assert db_session.scalar(select(func.count()).select_from(Episode)) == 2
    stored = db_session.scalar(select(Episode).where(Episode.episode_id == "EP-010"))
    assert stored.robot_id == "arm-01"
    assert stored.quality == EpisodeQuality.GOOD


def test_duplicate_ids_in_file_import_only_first(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    response = upload(client, users[UserRole.OPERATOR], HEADER + row("EP-020") + row(" EP-020 ", "bad"))
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 1
    assert body["summary"]["duplicate_episode_id_in_file"] == 1
    assert db_session.scalar(select(func.count()).select_from(Episode)) == 1


def test_invalid_rows_are_skipped_with_reasons(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    csv_text = (
        HEADER
        + row("EP-030")
        + ",robot-01,Pick and Place,2026-09-28T10:00:00,12,Operator,good\n"
        + row("EP-031", "excellent")
        + row("EP-032", "good", "-1")
        + row("EP-033", "good", "abc")
        + row("EP-034", "good", "12", "bad-date")
        + row("EP-035", "good", "12.5")
    )
    response = upload(client, users[UserRole.OPERATOR], csv_text)
    assert response.status_code == 200
    body = response.json()
    assert body["total_rows"] == 7
    assert body["imported"] == 2
    assert body["skipped"] == 5
    assert body["summary"]["missing_episode_id"] == 1
    assert body["summary"]["invalid_quality"] == 1
    assert body["summary"]["invalid_duration"] == 2
    assert body["summary"]["invalid_recorded_at"] == 1
    stored = db_session.scalar(select(Episode).where(Episode.episode_id == "EP-035"))
    assert stored.duration_seconds == 13


def test_missing_required_values_and_missing_columns_are_rejected(
    client: TestClient, users: dict[UserRole, User]
) -> None:
    missing_robot = HEADER + "EP-040,,Pick and Place,2026-09-28T10:00:00,12,Operator,good\n"
    response = upload(client, users[UserRole.OPERATOR], missing_robot)
    assert response.json()["summary"]["missing_robot_id"] == 1
    missing_columns = "episode_id,robot_id,task_name\nEP-041,robot,task\n"
    response = upload(client, users[UserRole.OPERATOR], missing_columns)
    assert response.status_code == 422
    assert "missing required columns" in response.json()["detail"]


def test_seed_constraints_normalize_ids_and_reject_unknown_or_invalid_values(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    csv_text = (
        HEADER
        + row("ep-060")
        + "EP-061,arm-99,Pick and Place,2026-09-28T10:00:00,12,Operator,good\n"
        + "EP-062,arm-01,Pick and Place,2026-09-28T10:00:00,999999,Operator,good\n"
        + "EP-063,arm-01,Pick and Place,2031-01-01T00:00:00,12,Operator,good\n"
    )
    response = upload(client, users[UserRole.OPERATOR], csv_text)

    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 1
    assert body["summary"] == {
        "unknown_robot": 1,
        "invalid_duration": 1,
        "future_recorded_at": 1,
    }
    stored = db_session.scalar(select(Episode).where(Episode.episode_id == "EP-060"))
    assert stored is not None
    assert db_session.scalar(select(Episode).where(Episode.episode_id == "ep-060")) is None


def test_mixed_seed_timestamp_and_task_casing_are_normalized(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    csv_text = HEADER + "EP-064,arm-01,  Pick Cup  ,14/08/2026 09:15,12,Operator,GOOD\n"
    response = upload(client, users[UserRole.OPERATOR], csv_text)

    assert response.status_code == 200
    stored = db_session.scalar(select(Episode).where(Episode.episode_id == "EP-064"))
    assert stored is not None
    assert stored.task_name == "pick cup"
    assert stored.recorded_at.year == 2026


def test_existing_database_episode_is_skipped(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    db_session.add(Episode(episode_id="EP-050", robot_id="old-robot", task_name="Old task", quality=EpisodeQuality.GOOD))
    db_session.commit()
    response = upload(client, users[UserRole.ADMIN], HEADER + row("EP-050"))
    assert response.status_code == 200
    assert response.json()["summary"]["duplicate_episode_id"] == 1
    assert db_session.scalar(select(func.count()).select_from(Episode)) == 1


def test_provided_seed_csv_is_idempotent(
    client: TestClient, db_session: Session, users: dict[UserRole, User]
) -> None:
    seed_csv = Path(__file__).parents[2] / "seed" / "episodes.csv"
    csv_text = seed_csv.read_text(encoding="utf-8")
    first = upload(client, users[UserRole.OPERATOR], csv_text)
    first_count = db_session.scalar(select(func.count()).select_from(Episode))
    second = upload(client, users[UserRole.OPERATOR], csv_text)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["total_rows"] > 0
    assert first.json()["imported"] == first_count
    assert second.json()["imported"] == 0
    assert second.json()["summary"]["duplicate_episode_id"] == first_count
    assert db_session.scalar(select(func.count()).select_from(Episode)) == first_count
