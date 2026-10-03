from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.user import UserActiveUpdate, UserCreate, UserResponse, UserRoleUpdate
from app.services.user_service import (
    UserEmailAlreadyExistsError,
    LastActiveAdminError,
    UserNotFoundError,
    create_user,
    list_users,
    update_user_active,
    update_user_role,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def get_users(
    _: User = Depends(require_admin),
    session: Session = Depends(get_db),
) -> list[UserResponse]:
    return [UserResponse.model_validate(user) for user in list_users(session)]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    data: UserCreate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_db),
) -> UserResponse:
    try:
        return UserResponse.model_validate(create_user(session, data))
    except UserEmailAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists") from None


@router.patch("/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: int,
    data: UserRoleUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_db),
) -> UserResponse:
    try:
        return UserResponse.model_validate(update_user_role(session, user_id, data.role))
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") from None
    except LastActiveAdminError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="At least one active admin is required") from None


@router.patch("/{user_id}/active", response_model=UserResponse)
def change_user_active_state(
    user_id: int,
    data: UserActiveUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_db),
) -> UserResponse:
    try:
        return UserResponse.model_validate(update_user_active(session, user_id, data.is_active))
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") from None
    except LastActiveAdminError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="At least one active admin is required") from None
