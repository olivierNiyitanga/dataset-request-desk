import json
import logging
from time import perf_counter

from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.config import settings

request_logger = logging.getLogger("dataset_request_desk.requests")


def configure_logging() -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.log_level)
    request_logger.setLevel(settings.log_level)


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        started_at = perf_counter()
        status_code = 500

        async def send_with_status(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_with_status)
        finally:
            event = {
                "method": request.method,
                "path": request.url.path,
                "status": status_code,
                "duration_ms": round((perf_counter() - started_at) * 1000, 3),
                "user_id": getattr(request.state, "user_id", None),
            }
            request_logger.info(json.dumps(event, separators=(",", ":")))
