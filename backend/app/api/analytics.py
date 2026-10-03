from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_operator_or_admin
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics_service import get_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def analytics(
    from_date: date = Query(...),
    to_date: date = Query(...),
    _: User = Depends(require_operator_or_admin),
    session: Session = Depends(get_db),
) -> AnalyticsResponse:
    if from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="from_date must be less than or equal to to_date",
        )
    return get_analytics(session, from_date, to_date)
