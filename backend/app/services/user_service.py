from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.utils.security import hash_password


class UserServiceError(Exception):
    pass


class UserNotFoundError(UserServiceError):
    pass


class UserEmailAlreadyExistsError(UserServiceError):
    pass


class LastActiveAdminError(UserServiceError):
    pass


def list_users(session: Session) -> list[User]:
    return list(session.scalars(select(User).order_by(User.id)))


def create_user(session: Session, data: UserCreate) -> User:
    user = User(
        email=str(data.email).lower(),
        name=data.name.strip() if data.name else None,
        organisation=data.organisation.strip() if data.organisation else None,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise UserEmailAlreadyExistsError from None
    return user


def update_user_role(session: Session, user_id: int, role: UserRole) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise UserNotFoundError
    if user.role == UserRole.ADMIN and role != UserRole.ADMIN and user.is_active:
        admin_count = session.scalar(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active)
        ) or 0
        if admin_count <= 1:
            raise LastActiveAdminError
    user.role = role
    session.commit()
    session.refresh(user)
    return user


def update_user_active(session: Session, user_id: int, is_active: bool) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise UserNotFoundError
    if user.role == UserRole.ADMIN and user.is_active and not is_active:
        admin_count = session.scalar(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active)
        ) or 0
        if admin_count <= 1:
            raise LastActiveAdminError
    user.is_active = is_active
    session.commit()
    session.refresh(user)
    return user
