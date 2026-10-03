"""Create idempotent development users from the repository seed file."""

import json
from pathlib import Path

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.security import hash_password

USERS_FILE = Path(__file__).resolve().parents[1] / "seed" / "users.json"


def seed_users() -> None:
    with SessionLocal.begin() as session:
        users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
        for user_data in users:
            email = user_data["email"]
            password = user_data["password"]
            role = UserRole(user_data["role"])
            user = session.scalar(select(User).where(User.email == email))
            if user is None:
                session.add(
                    User(
                        email=email,
                        name=user_data.get("name"),
                        organisation=user_data.get("organisation"),
                        password_hash=hash_password(password),
                        role=role,
                    )
                )
            else:
                user.name = user_data.get("name")
                user.organisation = user_data.get("organisation")


if __name__ == "__main__":
    seed_users()
    print("Development users seeded; existing passwords were left unchanged.")
