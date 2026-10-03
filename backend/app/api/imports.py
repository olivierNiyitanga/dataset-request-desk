from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_operator_or_admin
from app.models.user import User
from app.schemas.imports import ImportReport
from app.services.episode_import_service import ImportValidationError, import_csv

router = APIRouter(prefix="/api/episodes", tags=["episode-import"])


@router.post("/import", response_model=ImportReport)
def import_episodes(
    file: UploadFile = File(...),
    _: User = Depends(require_operator_or_admin),
    session: Session = Depends(get_db),
) -> ImportReport:
    try:
        return import_csv(session, file.file, file.filename or "upload.csv")
    except ImportValidationError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from None
