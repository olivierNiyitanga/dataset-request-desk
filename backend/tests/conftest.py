from collections.abc import Generator
import os

os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-key")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("POSTGRES_DB", "test_database")
os.environ.setdefault("POSTGRES_USER", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD", "test_password")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.utils.security import hash_password


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    with session_factory() as session:
        yield session
    Base.metadata.drop_all(engine)


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def users(db_session: Session) -> dict[UserRole, User]:
    created = {}
    for index, role in enumerate(UserRole, start=1):
        user = User(
            id=index,
            email=f"{role.value}@example.com",
            password_hash=hash_password("CorrectPassword123!"),
            role=role,
        )
        db_session.add(user)
        created[role] = user
    db_session.commit()
    return created
