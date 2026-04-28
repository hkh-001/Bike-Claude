"""APScheduler 自动调度服务.

BackgroundScheduler 在独立线程中运行周期任务。
每 source 一把 threading.Lock，防止同一 source 并发抓取。
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 全局状态
# ---------------------------------------------------------------------------

_scheduler: BackgroundScheduler | None = None
_source_locks: dict[str, threading.Lock] = {}
_source_states: dict[str, dict[str, Any]] = {}

_DEFAULT_INTERVAL_SECONDS = 300  # 5 分钟

# ---------------------------------------------------------------------------
# helper
# ---------------------------------------------------------------------------


def _now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ensure_lock(source_code: str) -> threading.Lock:
    if source_code not in _source_locks:
        _source_locks[source_code] = threading.Lock()
    return _source_locks[source_code]


# ---------------------------------------------------------------------------
# 带锁的 ETL 执行（手动 + 自动共用）
# ---------------------------------------------------------------------------


def run_etl_locked(source_code: str) -> dict[str, Any]:
    """带锁的 ETL 执行入口，手动触发和 APScheduler 自动任务共用同一套锁.

    若同 source 已有任务在运行，则返回 skipped 状态，不重复执行。
    无论成功/失败/异常，均保证释放 lock。
    """
    lock = _ensure_lock(source_code)
    if not lock.acquire(blocking=False):
        logger.warning("ETL job skipped: %s is already running", source_code)
        _source_states.setdefault(source_code, {})["skipped_at"] = _now_naive()
        return {
            "status": "skipped",
            "source_code": source_code,
            "reason": "already_running",
        }

    state = _source_states.setdefault(source_code, {})
    state["is_running"] = True
    state["last_started_at"] = _now_naive()
    state["last_error"] = None

    try:
        from sqlmodel import Session

        from app.db.session import engine
        from app.services.etl_service import run_etl_for_source

        with Session(engine) as session:
            result = run_etl_for_source(source_code, session)

        state["last_status"] = result.status
        state["last_error"] = result.error_message
        logger.info(
            "ETL done: %s — status=%s stations=%d/%d duration=%dms",
            source_code,
            result.status,
            result.updated_stations,
            result.station_information_count,
            result.duration_ms,
        )
        return {
            "status": result.status,
            "source_code": result.source_code,
            "station_information_count": result.station_information_count,
            "station_status_count": result.station_status_count,
            "updated_stations": result.updated_stations,
            "snapshot_count": result.snapshot_count,
            "duration_ms": result.duration_ms,
            "error_message": result.error_message,
        }
    except Exception as exc:
        logger.exception("ETL failed: %s", source_code)
        state["last_status"] = "failed"
        state["last_error"] = str(exc)
        return {
            "status": "failed",
            "source_code": source_code,
            "error": str(exc),
        }
    finally:
        state["is_running"] = False
        state["last_finished_at"] = _now_naive()
        lock.release()


# ---------------------------------------------------------------------------
# APScheduler job 入口
# ---------------------------------------------------------------------------


def _run_etl_job(source_code: str) -> None:
    """APScheduler job 入口：调用带锁的公共入口."""
    run_etl_locked(source_code)


# ---------------------------------------------------------------------------
# 启动 / 停止 / 状态
# ---------------------------------------------------------------------------


def start_scheduler(interval_seconds: int = _DEFAULT_INTERVAL_SECONDS) -> None:
    """启动 scheduler 并注册默认 job（US-CITIBIKE）.

    防重复启动：
    - 若 _scheduler 已存在且 running，检查是否已有 etl_us_citibike job；
      若已存在则直接跳过，避免 uvicorn --reload 时重复注册。
    """
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        existing = _scheduler.get_job("etl_us_citibike")
        if existing:
            logger.info(
                "Scheduler 已在运行且 job 已注册，跳过重复启动"
            )
            return
        # scheduler 在运行但 job 被清掉了（异常情况），继续重新注册

    # 若 _scheduler 存在但不在运行（如之前 shutdown 后未置 None），重建
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:
            pass

    _scheduler = BackgroundScheduler()

    # 注册 US-CITIBIKE 周期任务
    _scheduler.add_job(
        _run_etl_job,
        trigger=IntervalTrigger(seconds=interval_seconds),
        id="etl_us_citibike",
        name="ETL US-CITIBIKE",
        args=["US-CITIBIKE"],
        replace_existing=True,
        max_instances=1,
    )

    _scheduler.start()
    logger.info(
        "Scheduler 已启动：US-CITIBIKE 每 %d 秒抓取一次", interval_seconds
    )


def stop_scheduler() -> None:
    """优雅关闭 scheduler."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler 已关闭")
    _scheduler = None


def get_scheduler_status() -> dict[str, Any]:
    """返回 scheduler 状态与 job 列表."""
    enabled = _scheduler is not None and _scheduler.running
    jobs: list[dict[str, Any]] = []

    if enabled and _scheduler:
        for job in _scheduler.get_jobs():
            source_code = job.args[0] if job.args else "unknown"
            state = _source_states.get(source_code, {})
            jobs.append(
                {
                    "source_code": source_code,
                    "interval_seconds": (
                        job.trigger.interval.total_seconds()
                        if hasattr(job.trigger, "interval")
                        else None
                    ),
                    "is_running": state.get("is_running", False),
                    "last_started_at": state.get("last_started_at"),
                    "last_finished_at": state.get("last_finished_at"),
                    "last_status": state.get("last_status"),
                    "last_error": state.get("last_error"),
                    "next_run_at": (
                        job.next_run_time.isoformat()
                        if job.next_run_time
                        else None
                    ),
                }
            )

    return {
        "enabled": enabled,
        "jobs": jobs,
    }
