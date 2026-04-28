"""ETL 管理路由：手动触发、数据源列表、抓取日志、状态概览."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.data_source import DataSource
from app.models.fetch_log import FetchLog
from app.models.gbfs_feed import GbfsFeed
from app.models.station import Station
from app.schemas.etl import (
    DataSourceItem,
    EtlStatusResponse,
    FetchLogItem,
    FetchRequest,
    FetchResponse,
    SchedulerStatusResponse,
    SchedulerJobItem,
)
from app.services import scheduler_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["etl"])

_FRESHNESS_WINDOW = timedelta(minutes=5)


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# POST /api/etl/fetch
# ---------------------------------------------------------------------------


@router.post("/fetch", response_model=FetchResponse)
def etl_fetch(
    body: FetchRequest,
    session: Session = Depends(get_session),
) -> FetchResponse:
    """手动触发一次 GBFS 抓取（与 APScheduler 自动任务共用同一套锁）."""
    logger.info("手动触发 ETL: %s", body.source_code)
    raw = scheduler_service.run_etl_locked(body.source_code)
    if raw.get("status") == "skipped":
        return FetchResponse(
            source_code=body.source_code,
            station_information_count=0,
            station_status_count=0,
            updated_stations=0,
            snapshot_count=0,
            status="skipped",
            duration_ms=0,
            error_message=raw.get("reason", "already_running"),
        )
    return FetchResponse(
        source_code=raw.get("source_code", body.source_code),
        station_information_count=raw.get("station_information_count", 0),
        station_status_count=raw.get("station_status_count", 0),
        updated_stations=raw.get("updated_stations", 0),
        snapshot_count=raw.get("snapshot_count", 0),
        status=raw.get("status", "failed"),
        duration_ms=raw.get("duration_ms", 0),
        error_message=raw.get("error_message") or raw.get("error"),
    )


# ---------------------------------------------------------------------------
# GET /api/etl/sources
# ---------------------------------------------------------------------------


@router.get("/sources", response_model=list[DataSourceItem])
def etl_sources(
    session: Session = Depends(get_session),
) -> list[DataSourceItem]:
    """返回所有数据源配置（含最近抓取时间）."""
    sources = session.exec(select(DataSource)).all()

    # 批量查最近 fetch_log
    feed_ids: list[int] = []
    feed_to_source: dict[int, str] = {}
    for s in sources:
        feeds = session.exec(
            select(GbfsFeed).where(GbfsFeed.source_id == s.id)
        ).all()
        for f in feeds:
            feed_ids.append(f.id)
            feed_to_source[f.id] = s.code

    latest_fetch: dict[str, datetime | None] = {}
    if feed_ids:
        # 子查询：每个 feed 最近一条成功 log
        rows = session.exec(
            select(FetchLog.feed_id, func.max(FetchLog.started_at))
            .where(FetchLog.feed_id.in_(feed_ids), FetchLog.status == "success")
            .group_by(FetchLog.feed_id)
        ).all()
        for fid, ts in rows:
            sc = feed_to_source.get(fid)
            if sc:
                latest_fetch[sc] = max(
                    latest_fetch.get(sc) or ts, ts
                ) if latest_fetch.get(sc) else ts

    return [
        DataSourceItem(
            id=s.id or 0,
            code=s.code,
            name=s.name,
            provider=s.provider,
            city=s.city,
            gbfs_url=s.gbfs_url,
            enabled=s.enabled,
            last_fetch_at=latest_fetch.get(s.code),
        )
        for s in sources
    ]


# ---------------------------------------------------------------------------
# GET /api/etl/logs
# ---------------------------------------------------------------------------


@router.get("/logs", response_model=list[FetchLogItem])
def etl_logs(
    source_code: str | None = None,
    limit: int = 20,
    session: Session = Depends(get_session),
) -> list[FetchLogItem]:
    """返回抓取日志列表."""
    stmt = (
        select(FetchLog, GbfsFeed, DataSource)
        .join(GbfsFeed, FetchLog.feed_id == GbfsFeed.id)
        .join(DataSource, GbfsFeed.source_id == DataSource.id)
        .order_by(FetchLog.started_at.desc())
        .limit(limit)
    )
    if source_code:
        stmt = stmt.where(DataSource.code == source_code)

    rows = session.exec(stmt).all()
    return [
        FetchLogItem(
            id=log.id or 0,
            feed_name=feed.feed_name,
            source_name=source.name,
            started_at=log.started_at,
            finished_at=log.finished_at,
            status=log.status,
            records=log.records,
            duration_ms=log.duration_ms,
            error=log.error,
        )
        for log, feed, source in rows
    ]


# ---------------------------------------------------------------------------
# GET /api/etl/status
# ---------------------------------------------------------------------------


@router.get("/status", response_model=EtlStatusResponse)
def etl_status(
    session: Session = Depends(get_session),
) -> EtlStatusResponse:
    """返回 ETL 整体状态：活跃 source、数据新鲜度、station 统计."""
    now = _utcnow_naive()

    # Station 统计
    total_stations = session.exec(select(func.count(Station.id))).one() or 0
    real_stations = session.exec(
        select(func.count(Station.id)).where(Station.source_system != "mock")
    ).one() or 0
    mock_stations = session.exec(
        select(func.count(Station.id)).where(Station.source_system == "mock")
    ).one() or 0

    # 最近成功抓取（非 mock）
    latest_success = session.exec(
        select(FetchLog)
        .join(GbfsFeed, FetchLog.feed_id == GbfsFeed.id)
        .join(DataSource, GbfsFeed.source_id == DataSource.id)
        .where(FetchLog.status == "success", DataSource.code != "CN-MOCK")
        .order_by(FetchLog.started_at.desc())
        .limit(1)
    ).first()

    # 最近失败抓取（非 mock）
    latest_failure = session.exec(
        select(FetchLog)
        .join(GbfsFeed, FetchLog.feed_id == GbfsFeed.id)
        .join(DataSource, GbfsFeed.source_id == DataSource.id)
        .where(FetchLog.status == "failed", DataSource.code != "CN-MOCK")
        .order_by(FetchLog.started_at.desc())
        .limit(1)
    ).first()

    last_success_at: datetime | None = None
    last_failure_at: datetime | None = None
    active_source: str | None = None
    freshness_seconds: int | None = None
    data_freshness = "mock"
    is_fresh = False

    if latest_success:
        last_success_at = latest_success.started_at
        feed = session.get(GbfsFeed, latest_success.feed_id)
        if feed:
            ds = session.get(DataSource, feed.source_id)
            if ds:
                active_source = ds.code
        freshness_seconds = int((now - last_success_at).total_seconds())
        is_fresh = freshness_seconds <= _FRESHNESS_WINDOW.total_seconds()
        data_freshness = "fresh" if is_fresh else "stale"

    if latest_failure:
        last_failure_at = latest_failure.started_at

    # scheduler 状态
    sched = scheduler_service.get_scheduler_status()

    # sources 列表
    sources = etl_sources(session)

    return EtlStatusResponse(
        active_source=active_source,
        data_freshness=data_freshness,
        active_source_is_fresh=is_fresh,
        active_source_age_seconds=freshness_seconds,
        total_stations=int(total_stations),
        real_stations=int(real_stations),
        mock_stations=int(mock_stations),
        last_success_fetch_at=last_success_at,
        last_failure_at=last_failure_at,
        data_freshness_seconds=freshness_seconds,
        scheduler_enabled=sched["enabled"],
        scheduler_running=any(j.get("is_running", False) for j in sched["jobs"]),
        sources=sources,
    )


# ---------------------------------------------------------------------------
# GET /api/etl/scheduler/status
# ---------------------------------------------------------------------------


@router.get("/scheduler/status", response_model=SchedulerStatusResponse)
def scheduler_status() -> SchedulerStatusResponse:
    """返回 APScheduler 状态与 job 列表."""
    raw = scheduler_service.get_scheduler_status()
    jobs = [
        SchedulerJobItem(
            source_code=j["source_code"],
            interval_seconds=j.get("interval_seconds"),
            is_running=j.get("is_running", False),
            last_started_at=j.get("last_started_at"),
            last_finished_at=j.get("last_finished_at"),
            last_status=j.get("last_status"),
            next_run_at=j.get("next_run_at"),
            last_error=j.get("last_error"),
        )
        for j in raw.get("jobs", [])
    ]
    return SchedulerStatusResponse(
        enabled=raw.get("enabled", False),
        jobs=jobs,
    )
