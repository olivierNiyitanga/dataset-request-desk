from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    get_current_user,
    require_admin,
    require_client,
    require_operator,
    require_operator_or_admin,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import InvalidCredentialsError, issue_access_token

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, session: Session = Depends(get_db)) -> TokenResponse:
    try:
        access_token, user = issue_access_token(session, credentials)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    return TokenResponse(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


# These small role probes keep the authorization dependencies verifiable until feature routes exist.
@router.get("/role-check/client", response_model=UserResponse)
def client_role_check(current_user: User = Depends(require_client)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.get("/role-check/operator", response_model=UserResponse)
def operator_role_check(current_user: User = Depends(require_operator)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.get("/role-check/admin", response_model=UserResponse)
def admin_role_check(current_user: User = Depends(require_admin)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.get("/role-check/operator-or-admin", response_model=UserResponse)
def operator_or_admin_role_check(
    current_user: User = Depends(require_operator_or_admin),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
