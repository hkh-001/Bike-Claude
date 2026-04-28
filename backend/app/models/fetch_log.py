"""ETL 抓取日志."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class FetchLog(SQLModel, table=True):
    """ETL 抓取一次的执行日志."""

    __tablename__ = "fetch_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    feed_id: int = Field(foreign_key="gbfs_feed.id", index=True)
    started_at: datetime = Field(index=True)
    finished_at: Optional[datetime] = Field(default=None)
    status: str = Field(index=True, description="success / failed")
    records: int = Field(default=0, description="处理记录数")
    duration_ms: int = Field(default=0)
    error: Optional[str] = Field(default=None)
