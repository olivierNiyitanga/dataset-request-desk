"""Streaming, idempotent episode CSV import.

Rows are normalized by trimming text fields and lowercasing quality. Decimal durations
are rounded half up to the nearest whole second because Episode.duration_seconds is an
integer. The first valid occurrence of an episode_id wins within a file.
"""

import csv
import io
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import BinaryIO

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.episode import Episode, EpisodeQuality
from app.schemas.imports import ImportErrorDetail, ImportReport

MAX_IMPORT_BYTES = 25 * 1024 * 1024
BATCH_SIZE = 500
REQUIRED_COLUMNS = (
    "episode_id",
    "robot_id",
    "task_name",
    "recorded_at",
    "duration_seconds",
    "operator_name",
    "quality",
)
MAX_ERROR_DETAILS = 1000
MAX_DURATION_SECONDS = 3600
KNOWN_ROBOTS = {"arm-01", "arm-02", "arm-03", "mobile-01", "humanoid-01"}


class ImportValidationError(Exception):
    pass


@dataclass(frozen=True)
class ValidatedEpisode:
    episode_id: str
    robot_id: str
    task_name: str
    recorded_at: datetime
    duration_seconds: int
    operator_name: str
    quality: EpisodeQuality


class ImportReportBuilder:
    def __init__(self, filename: str) -> None:
        self.filename = filename
        self.total_rows = 0
        self.imported = 0
        self.skipped = 0
        self.summary: Counter[str] = Counter()
        self.errors: list[ImportErrorDetail] = []

    def skipped_row(self, row: int, episode_id: str | None, reason: str) -> None:
        self.skipped += 1
        self.summary[reason] += 1
        if len(self.errors) < MAX_ERROR_DETAILS:
            self.errors.append(ImportErrorDetail(row=row, episode_id=episode_id, reason=reason))

    def report(self) -> ImportReport:
        return ImportReport(
            filename=self.filename,
            total_rows=self.total_rows,
            imported=self.imported,
            skipped=self.skipped,
            summary=dict(self.summary),
            errors=self.errors,
        )


def _normalize_header(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def _normalize_text(value: str | None) -> str:
    return (value or "").strip()


def _parse_row(row: dict[str, str | None]) -> tuple[ValidatedEpisode | None, str | None, str | None]:
    normalized = {
        _normalize_header(key): _normalize_text(value)
        for key, value in row.items()
        if key is not None
    }
    episode_id = normalized.get("episode_id") or None
    for field in REQUIRED_COLUMNS:
        if not normalized.get(field):
            return None, episode_id, f"missing_{field}"

    episode_id = episode_id.upper() if episode_id else None
    robot_id = normalized["robot_id"].lower()
    if robot_id not in KNOWN_ROBOTS:
        return None, episode_id, "unknown_robot"

    quality_value = normalized["quality"].lower()
    if quality_value not in {quality.value for quality in EpisodeQuality}:
        return None, episode_id, "invalid_quality"

    try:
        duration_decimal = Decimal(normalized["duration_seconds"])
        if not duration_decimal.is_finite() or duration_decimal <= 0 or duration_decimal > MAX_DURATION_SECONDS:
            raise InvalidOperation
        duration_seconds = int(duration_decimal.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError):
        return None, episode_id, "invalid_duration"

    recorded_at_value = normalized["recorded_at"]
    try:
        recorded_at = _parse_recorded_at(recorded_at_value)
    except ValueError:
        return None, episode_id, "invalid_recorded_at"
    if recorded_at.tzinfo is None:
        recorded_at = recorded_at.replace(tzinfo=timezone.utc)
    if recorded_at > datetime.now(timezone.utc):
        return None, episode_id, "future_recorded_at"

    return (
        ValidatedEpisode(
            episode_id=episode_id or "",
            robot_id=robot_id,
            task_name=normalized["task_name"].casefold(),
            recorded_at=recorded_at,
            duration_seconds=duration_seconds,
            operator_name=normalized["operator_name"],
            quality=EpisodeQuality(quality_value),
        ),
        episode_id,
        None,
    )


def _validate_columns(fieldnames: list[str] | None) -> None:
    if not fieldnames:
        raise ImportValidationError("CSV header is missing")
    normalized = {_normalize_header(fieldname) for fieldname in fieldnames}
    missing = [column for column in REQUIRED_COLUMNS if column not in normalized]
    if missing:
        raise ImportValidationError(f"CSV is missing required columns: {', '.join(missing)}")


def _parse_recorded_at(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        for date_format in ("%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S"):
            try:
                return datetime.strptime(value, date_format)
            except ValueError:
                continue
    raise ValueError("unsupported recorded_at format")


def _episode_from_row(row: ValidatedEpisode) -> Episode:
    return Episode(
        episode_id=row.episode_id,
        robot_id=row.robot_id,
        task_name=row.task_name,
        recorded_at=row.recorded_at,
        duration_seconds=row.duration_seconds,
        operator_name=row.operator_name,
        quality=row.quality,
    )


def _insert_batch(
    session: Session,
    rows: list[ValidatedEpisode],
    builder: ImportReportBuilder,
    row_numbers: dict[str, int],
) -> None:
    if not rows:
        return
    ids = [row.episode_id for row in rows]
    existing_ids = set(session.scalars(select(Episode.episode_id).where(Episode.episode_id.in_(ids))))
    candidates = [row for row in rows if row.episode_id not in existing_ids]
    for row in rows:
        if row.episode_id in existing_ids:
            builder.skipped_row(row_numbers[row.episode_id], row.episode_id, "duplicate_episode_id")

    if not candidates:
        return

    session.add_all([_episode_from_row(row) for row in candidates])
    try:
        session.commit()
        builder.imported += len(candidates)
    except IntegrityError:
        session.rollback()
        # A concurrent import may have won the unique constraint after the batch query.
        for row in candidates:
            episode = _episode_from_row(row)
            session.add(episode)
            try:
                session.commit()
                builder.imported += 1
            except IntegrityError:
                session.rollback()
                builder.skipped_row(row_numbers[row.episode_id], row.episode_id, "duplicate_episode_id")
            except SQLAlchemyError:
                session.rollback()
                raise
    except SQLAlchemyError:
        session.rollback()
        raise


def import_csv(session: Session, file: BinaryIO, filename: str) -> ImportReport:
    if filename:
        filename = Path(filename).name
    builder = ImportReportBuilder(filename or "upload.csv")

    try:
        current_position = file.tell()
        file.seek(0, io.SEEK_END)
        file_size = file.tell()
        file.seek(current_position)
    except (AttributeError, OSError):
        file_size = 0
    if file_size > MAX_IMPORT_BYTES:
        raise ImportValidationError("CSV file exceeds the 25 MB size limit")

    text_file = io.TextIOWrapper(file, encoding="utf-8-sig", newline="")
    reader = csv.DictReader(text_file)
    _validate_columns(reader.fieldnames)

    seen_in_file: set[str] = set()
    batch: list[ValidatedEpisode] = []
    row_numbers: dict[str, int] = {}
    for row_number, row in enumerate(reader, start=2):
        builder.total_rows += 1
        parsed, episode_id, reason = _parse_row(row)
        if reason is not None or parsed is None:
            builder.skipped_row(row_number, episode_id, reason or "invalid_row")
            continue
        if parsed.episode_id in seen_in_file:
            builder.skipped_row(row_number, parsed.episode_id, "duplicate_episode_id_in_file")
            continue
        seen_in_file.add(parsed.episode_id)
        row_numbers[parsed.episode_id] = row_number
        batch.append(parsed)
        if len(batch) >= BATCH_SIZE:
            _insert_batch(session, batch, builder, row_numbers)
            batch.clear()

    _insert_batch(session, batch, builder, row_numbers)
    text_file.detach()
    return builder.report()
