from pydantic import BaseModel, Field


class ImportErrorDetail(BaseModel):
    row: int
    episode_id: str | None = None
    reason: str


class ImportReport(BaseModel):
    filename: str
    total_rows: int
    imported: int
    skipped: int
    summary: dict[str, int]
    errors: list[ImportErrorDetail] = Field(default_factory=list)
