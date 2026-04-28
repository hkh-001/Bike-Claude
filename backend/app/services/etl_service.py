"""ETL 编排服务：GBFS 抓取 → 数据转换 → 入库.

流程：
1. 读 DataSource 配置
2. GBFS auto-discovery → 获取 feed URL
3. 拉 station_information + station_status
4. Upsert station / cur_station_status
5. Append fact_station_snapshot
6. 写 fetch_log

幂等规则：
- station: (source_system, code) 联合判断，存在则 update，不存在则 insert
- cur_station_status: station_id 覆盖更新
- fact_station_snapshot: (station_id, ts) 去重
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlmodel import Session, select

from app.models.cur_station_status import CurStationStatus
from app.models.data_source import DataSource
from app.models.fact_station_snapshot import FactStationSnapshot
from app.models.fetch_log import FetchLog
from app.models.gbfs_feed import GbfsFeed
from app.models.region import Region
from app.models.station import Station
from app.services import gbfs_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 结果载体
# ---------------------------------------------------------------------------


@dataclass
class FetchResult:
    source_code: str
    station_information_count: int
    station_status_count: int
    updated_stations: int
    snapshot_count: int
    status: str  # "success" | "partial" | "failed"
    duration_ms: int
    error_message: str | None = None


# ---------------------------------------------------------------------------
# 内部 helper
# ---------------------------------------------------------------------------


def _now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _bucket_floor(now: datetime) -> datetime:
    return now.replace(minute=0, second=0, microsecond=0)


def _ensure_region_for_source(session: Session, source: DataSource) -> Region:
    """为数据源创建/复用一个兜底 Region（当 GBFS 不提供 region_id 时使用）."""
    region_code = source.code
    region = session.exec(
        select(Region).where(Region.code == region_code)
    ).first()
    if region is None:
        region = Region(
            code=region_code,
            name=source.name,
            city=source.city or source.name,
            geo_polygon=None,
        )
        session.add(region)
        session.commit()
        session.refresh(region)
        logger.info("新建 Region: %s", region_code)
    return region


def _ensure_region_for_gbfs_region(
    session: Session,
    source_code: str,
    region_id: str,
    region_name: str,
    city: str | None = None,
) -> Region:
    """为 GBFS system_regions 中的单个 region 创建/复用 Region 记录.

    region_code 格式：{source_code}-{region_id}，例如 US-CITIBIKE-71
    """
    region_code = f"{source_code}-{region_id}"
    region = session.exec(
        select(Region).where(Region.code == region_code)
    ).first()
    if region is None:
        region = Region(
            code=region_code,
            name=region_name,
            city=city or "",
            geo_polygon=None,
        )
        session.add(region)
        session.commit()
        session.refresh(region)
        logger.info("新建 GBFS Region: %s -> %s", region_code, region_name)
    else:
        # 名称可能变化，更新
        if region.name != region_name:
            region.name = region_name
            session.add(region)
            session.commit()
    return region


def _ensure_feed_record(
    session: Session, source_id: int, feed_name: str, url: str
) -> GbfsFeed:
    """为指定 source + feed_name 创建/复用 GbfsFeed 记录."""
    feed = session.exec(
        select(GbfsFeed).where(
            GbfsFeed.source_id == source_id,
            GbfsFeed.feed_name == feed_name,
        )
    ).first()
    if feed is None:
        feed = GbfsFeed(
            source_id=source_id,
            feed_name=feed_name,
            url=url,
        )
        session.add(feed)
        session.commit()
        session.refresh(feed)
    else:
        # 更新 URL（discovery 可能变化）
        if feed.url != url:
            feed.url = url
            session.add(feed)
            session.commit()
    return feed


def _write_fetch_log(
    session: Session,
    feed_id: int,
    status: str,
    records: int,
    duration_ms: int,
    error: str | None = None,
) -> None:
    log = FetchLog(
        feed_id=feed_id,
        started_at=_now_naive(),
        finished_at=_now_naive(),
        status=status,
        records=records,
        duration_ms=duration_ms,
        error=error,
    )
    session.add(log)
    session.commit()


# ---------------------------------------------------------------------------
# 核心：单 source ETL 运行
# ---------------------------------------------------------------------------


def run_etl_for_source(source_code: str, session: Session) -> FetchResult:
    """为指定数据源执行一次完整的 GBFS ETL.

    Args:
        source_code: DataSource.code，如 "US-CITIBIKE"
        session: SQLModel Session

    Returns:
        FetchResult 汇总
    """
    started_at = _now_naive()
    error_message: str | None = None
    info_count = 0
    status_count = 0
    updated_stations = 0
    snapshot_count = 0

    # 1) 查 DataSource
    source = session.exec(
        select(DataSource).where(DataSource.code == source_code)
    ).first()
    if source is None:
        return FetchResult(
            source_code=source_code,
            station_information_count=0,
            station_status_count=0,
            updated_stations=0,
            snapshot_count=0,
            status="failed",
            duration_ms=0,
            error_message=f"DataSource '{source_code}' 不存在",
        )

    if not source.gbfs_url:
        return FetchResult(
            source_code=source_code,
            station_information_count=0,
            station_status_count=0,
            updated_stations=0,
            snapshot_count=0,
            status="failed",
            duration_ms=0,
            error_message=f"DataSource '{source_code}' 未配置 gbfs_url",
        )

    try:
        # 2) GBFS auto-discovery
        discovery = gbfs_client.fetch_gbfs_discovery(source.gbfs_url)
        info_url = gbfs_client.get_feed_url(discovery, "station_information")
        status_url = gbfs_client.get_feed_url(discovery, "station_status")

        # 3) 确保 GbfsFeed 记录存在（用于 fetch_log 外键）
        info_feed = _ensure_feed_record(session, source.id, "station_information", info_url)
        status_feed = _ensure_feed_record(session, source.id, "station_status", status_url)

        # 4) 拉 system_regions（若存在）
        gbfs_region_map: dict[str, Region] = {}
        try:
            regions_url = gbfs_client.get_feed_url(discovery, "system_regions")
            regions_list = gbfs_client.fetch_system_regions(regions_url)
            for gr in regions_list:
                region = _ensure_region_for_gbfs_region(
                    session, source_code, gr.region_id, gr.name, city=source.city
                )
                gbfs_region_map[gr.region_id] = region
            logger.info("system_regions 已加载：%d 个区域", len(gbfs_region_map))
        except Exception as exc:
            logger.warning("system_regions 不可用，使用 source-level fallback: %s", exc)

        # 兜底 region（当 station 没有 region_id 或 system_regions 不可用时）
        fallback_region = _ensure_region_for_source(session, source)

        # 5) 拉 station_information
        info_start = _now_naive()
        try:
            info_list = gbfs_client.fetch_station_information(info_url)
            info_count = len(info_list)
            _write_fetch_log(
                session,
                info_feed.id,
                status="success",
                records=info_count,
                duration_ms=int((_now_naive() - info_start).total_seconds() * 1000),
            )
        except Exception as exc:
            _write_fetch_log(
                session,
                info_feed.id,
                status="failed",
                records=0,
                duration_ms=int((_now_naive() - info_start).total_seconds() * 1000),
                error=str(exc),
            )
            raise

        # 6) 拉 station_status
        status_start = _now_naive()
        try:
            status_list = gbfs_client.fetch_station_status(status_url)
            status_count = len(status_list)
            _write_fetch_log(
                session,
                status_feed.id,
                status="success",
                records=status_count,
                duration_ms=int((_now_naive() - status_start).total_seconds() * 1000),
            )
        except Exception as exc:
            _write_fetch_log(
                session,
                status_feed.id,
                status="failed",
                records=0,
                duration_ms=int((_now_naive() - status_start).total_seconds() * 1000),
                error=str(exc),
            )
            raise

        # 7) 按 station_id 合并
        status_by_id: dict[str, gbfs_client.StationStatus] = {
            s.station_id: s for s in status_list
        }

        # 8) Upsert station + cur_station_status
        now = _now_naive()
        snapshot_ts = _bucket_floor(now)

        # 先查该 source 下已有 station 映射，减少重复查询
        existing_stations = session.exec(
            select(Station).where(
                Station.source_system == source_code,
            )
        ).all()
        station_by_code: dict[str, Station] = {s.code: s for s in existing_stations}

        for info in info_list:
            st = status_by_id.get(info.station_id)
            if st is None:
                # 有静态信息无实时状态：跳过（数据不完整时避免写入脏数据）
                continue

            # 根据 info.region_id 找到对应 Region
            target_region = fallback_region
            if info.region_id and info.region_id in gbfs_region_map:
                target_region = gbfs_region_map[info.region_id]

            station = station_by_code.get(info.station_id)
            if station is None:
                station = Station(
                    code=info.station_id,
                    source_system=source_code,
                    region_id=target_region.id,
                    name=info.name,
                    lat=info.lat,
                    lng=info.lon,
                    capacity=info.capacity,
                    status="active" if st.is_installed else "closed",
                )
                session.add(station)
                session.commit()
                session.refresh(station)
                station_by_code[info.station_id] = station
                updated_stations += 1
            else:
                # 更新可能变化的字段
                station.name = info.name
                station.lat = info.lat
                station.lng = info.lon
                station.capacity = info.capacity
                station.status = "active" if st.is_installed else "closed"
                station.region_id = target_region.id
                session.add(station)
                session.commit()
                updated_stations += 1

            # Upsert cur_station_status
            capacity = max(station.capacity, 1)
            occ = round(st.num_bikes_available / capacity, 4)

            cur = session.exec(
                select(CurStationStatus).where(
                    CurStationStatus.station_id == station.id
                )
            ).first()
            if cur is None:
                cur = CurStationStatus(
                    station_id=station.id,
                    ts=now,
                    bikes_available=st.num_bikes_available,
                    docks_available=st.num_docks_available,
                    occupancy_rate=occ,
                    updated_at=now,
                    is_renting=st.is_renting,
                    is_returning=st.is_returning,
                    is_installed=st.is_installed,
                    last_reported=st.last_reported,
                )
                session.add(cur)
            else:
                cur.ts = now
                cur.bikes_available = st.num_bikes_available
                cur.docks_available = st.num_docks_available
                cur.occupancy_rate = occ
                cur.updated_at = now
                cur.is_renting = st.is_renting
                cur.is_returning = st.is_returning
                cur.is_installed = st.is_installed
                cur.last_reported = st.last_reported
                session.add(cur)
            session.commit()

            # 9) Append fact_station_snapshot（去重）
            existing_snapshot = session.exec(
                select(FactStationSnapshot).where(
                    FactStationSnapshot.station_id == station.id,
                    FactStationSnapshot.ts == snapshot_ts,
                )
            ).first()
            if existing_snapshot is None:
                session.add(
                    FactStationSnapshot(
                        station_id=station.id,
                        ts=snapshot_ts,
                        bikes=st.num_bikes_available,
                        docks=st.num_docks_available,
                        occupancy_rate=occ,
                    )
                )
                snapshot_count += 1
        session.commit()

        # 更新 feed 的 last_updated
        info_feed.last_updated = now
        status_feed.last_updated = now
        session.add(info_feed)
        session.add(status_feed)
        session.commit()

    except Exception as exc:
        logger.exception("ETL 抓取失败: %s", source_code)
        error_message = str(exc)

    duration_ms = int((_now_naive() - started_at).total_seconds() * 1000)

    if error_message:
        return FetchResult(
            source_code=source_code,
            station_information_count=info_count,
            station_status_count=status_count,
            updated_stations=updated_stations,
            snapshot_count=snapshot_count,
            status="failed",
            duration_ms=duration_ms,
            error_message=error_message,
        )

    return FetchResult(
        source_code=source_code,
        station_information_count=info_count,
        station_status_count=status_count,
        updated_stations=updated_stations,
        snapshot_count=snapshot_count,
        status="success",
        duration_ms=duration_ms,
    )
