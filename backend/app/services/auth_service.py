from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import LoginRequest
from app.utils.security import create_access_token, verify_password_or_dummy


class InvalidCredentialsError(Exception):
    pass


def authenticate_user(session: Session, credentials: LoginRequest) -> User:
    user = session.scalar(select(User).where(User.email == str(credentials.email).lower()))
    password_is_valid = verify_password_or_dummy(
        credentials.password,
        user.password_hash if user is not None else None,
    )
    if user is None or not password_is_valid or not user.is_active:
        raise InvalidCredentialsError
    return user


def issue_access_token(session: Session, credentials: LoginRequest) -> tuple[str, User]:
    user = authenticate_user(session, credentials)
    return create_access_token(user.id), user
