"""ETL 相关请求/响应 schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FetchRequest(BaseModel):
    source_code: str


class FetchResponse(BaseModel):
    source_code: str
    station_information_count: int
    station_status_count: int
    updated_stations: int
    snapshot_count: int
    status: str
    duration_ms: int
    error_message: Optional[str] = None


class DataSourceItem(BaseModel):
    id: int
    code: str
    name: str
    provider: str
    city: Optional[str]
    gbfs_url: Optional[str]
    enabled: bool
    last_fetch_at: Optional[datetime] = None


class FetchLogItem(BaseModel):
    id: int
    feed_name: str
    source_name: str
    started_at: datetime
    finished_at: Optional[datetime]
    status: str
    records: int
    duration_ms: int
    error: Optional[str]


class EtlStatusResponse(BaseModel):
    active_source: Optional[str] = None
    data_freshness: str = "mock"  # "fresh" | "stale" | "mock"
    active_source_is_fresh: bool = False
    active_source_age_seconds: Optional[int] = None
    total_stations: int
    real_stations: int
    mock_stations: int
    last_success_fetch_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    data_freshness_seconds: Optional[int] = None
    scheduler_enabled: bool = False
    scheduler_running: bool = False
    sources: list[DataSourceItem]


class SchedulerJobItem(BaseModel):
    source_code: str
    interval_seconds: Optional[int] = None
    is_running: bool = False
    last_started_at: Optional[datetime] = None
    last_finished_at: Optional[datetime] = None
    last_status: Optional[str] = None
    next_run_at: Optional[str] = None
    last_error: Optional[str] = None


class SchedulerStatusResponse(BaseModel):
    enabled: bool
    jobs: list[SchedulerJobItem]
