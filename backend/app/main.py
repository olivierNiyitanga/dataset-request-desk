from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.auth import router as auth_router
from app.api.assignments import router as assignments_router
from app.api.episodes import router as episodes_router
from app.api.health import router as health_router
from app.api.imports import router as imports_router
from app.api.analytics import router as analytics_router
from app.api.requests import router as requests_router
from app.api.users import router as users_router
from app.middleware.logging import RequestLoggingMiddleware, configure_logging

configure_logging()
app = FastAPI(title="Dataset Request Desk API")
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(requests_router)
app.include_router(episodes_router)
app.include_router(assignments_router)
app.include_router(imports_router)
app.include_router(analytics_router)
app.include_router(users_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Dataset Request Desk API"}
