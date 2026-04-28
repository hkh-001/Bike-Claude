"""Mock 数据生成与装载.

设计目标：
- 3 城市（北京、上海、纽约）× 2 区域/城市 × 25 站点 = 150 站点
- 每站 24 条历史快照（每小时 1 条，覆盖近 24h）= 3600 行 fact_station_snapshot
  · 历史曲线 = 城市层面的 diurnal sin 形（8:30 / 18:00 双高峰下凹）
              + 每站固定偏置（站点性格）+ 高斯噪声 + 一阶平滑
- 150 行 cur_station_status（每站 1 行）
- 100 条告警（混合 info/warning/critical）
- 3 个数据源 × 2 个 feed = 6 feeds
- 每 feed 5 条 fetch_log

确定性随机：``random.seed(42)``，保证多次执行结果一致，便于测试和演示。
"""

from __future__ import annotations

import logging
import math
import random
from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlmodel import Session

from app.db.session import engine
from app.models.alert import Alert
from app.models.cur_station_status import CurStationStatus
from app.models.data_source import DataSource
from app.models.fact_station_snapshot import FactStationSnapshot
from app.models.fetch_log import FetchLog
from app.models.gbfs_feed import GbfsFeed
from app.models.region import Region
from app.models.station import Station

logger = logging.getLogger(__name__)


_CITIES = [
    {
        "name": "北京",
        "regions": [
            {"code": "BJ-CY", "name": "朝阳区", "center": (39.92, 116.44)},
            {"code": "BJ-HD", "name": "海淀区", "center": (39.99, 116.31)},
        ],
    },
    {
        "name": "上海",
        "regions": [
            {"code": "SH-PD", "name": "浦东新区", "center": (31.22, 121.55)},
            {"code": "SH-XH", "name": "徐汇区", "center": (31.18, 121.43)},
        ],
    },
    {
        "name": "New York",
        "regions": [
            {"code": "NYC-MN", "name": "Manhattan", "center": (40.76, -73.98)},
            {"code": "NYC-BK", "name": "Brooklyn", "center": (40.68, -73.95)},
        ],
    },
]

_STATIONS_PER_REGION = 25
_HISTORY_HOURS = 24
_ALERT_TOTAL = 100

_ALERT_LEVELS = ["info", "warning", "critical"]
_ALERT_TYPES = ["empty", "full", "offline", "anomaly", "etl_fail"]
_ALERT_STATUSES = ["open", "open", "open", "ack", "resolved"]  # 偏向 open


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _make_stations(rng: random.Random, region: Region) -> list[Station]:
    """围绕区域中心点撒站，约 ±0.04 度（~4km） 范围."""
    center_lat, center_lng = _CENTER_LOOKUP[region.code]
    stations: list[Station] = []
    for i in range(_STATIONS_PER_REGION):
        capacity = rng.choice([12, 16, 20, 24, 28, 32])
        lat = center_lat + rng.uniform(-0.04, 0.04)
        lng = center_lng + rng.uniform(-0.04, 0.04)
        stations.append(
            Station(
                code=f"{region.code}-S{i + 1:03d}",
                source_system="mock",
                region_id=region.id,
                name=f"{region.name}-{i + 1:03d}",
                lat=round(lat, 6),
                lng=round(lng, 6),
                capacity=capacity,
                status=rng.choices(
                    ["active", "active", "active", "active", "maintenance", "closed"],
                    k=1,
                )[0],
            )
        )
    return stations


_CENTER_LOOKUP: dict[str, tuple[float, float]] = {}


def _seed_regions(session: Session, rng: random.Random) -> list[Region]:
    regions: list[Region] = []
    for city in _CITIES:
        for r in city["regions"]:
            region = Region(
                code=r["code"],
                name=r["name"],
                city=city["name"],
                geo_polygon=None,
            )
            session.add(region)
            regions.append(region)
            _CENTER_LOOKUP[r["code"]] = r["center"]
    session.commit()
    for region in regions:
        session.refresh(region)
    return regions


def _seed_stations(session: Session, rng: random.Random, regions: Iterable[Region]) -> list[Station]:
    stations: list[Station] = []
    for region in regions:
        for s in _make_stations(rng, region):
            session.add(s)
            stations.append(s)
    session.commit()
    for s in stations:
        session.refresh(s)
    return stations


def _seed_status_and_history(
    session: Session, rng: random.Random, stations: list[Station]
) -> None:
    now = _utcnow_naive().replace(microsecond=0, second=0)
    # 历史快照时间戳必须对齐到整点（trend 服务按 ts 桶 group_by），cur_status 保留原始分钟
    history_anchor = now.replace(minute=0)
    history_rows: list[FactStationSnapshot] = []
    cur_rows: list[CurStationStatus] = []

    for station in stations:
        capacity = max(station.capacity, 1)
        # 每站固定偏置（站点性格：通勤型 vs 居民型 vs 中性）
        station_offset = rng.uniform(-0.10, 0.10)
        # 24 小时历史，每小时 1 条；曲线 = diurnal sin + offset + 噪声 + 一阶平滑
        # 范围 = [history_anchor - 23h, history_anchor]，覆盖 trend API 的 24 个整点桶
        last_occ: float | None = None
        last_bikes = 0
        for hours_ago in range(_HISTORY_HOURS - 1, -1, -1):
            ts = history_anchor - timedelta(hours=hours_ago)
            hour_f = ts.hour + ts.minute / 60.0
            base = _diurnal_occupancy(hour_f)
            target = base + station_offset + rng.gauss(0.0, 0.04)
            if last_occ is not None:
                target = 0.7 * target + 0.3 * last_occ  # 平滑
            target = max(0.0, min(1.0, target))
            last_occ = target

            last_bikes = max(0, min(capacity, round(target * capacity)))
            docks = capacity - last_bikes
            occ = round(last_bikes / capacity, 4)
            history_rows.append(
                FactStationSnapshot(
                    station_id=station.id,
                    ts=ts,
                    bikes=last_bikes,
                    docks=docks,
                    occupancy_rate=occ,
                )
            )

        # 当前状态：在最后一个历史值上轻微抖动
        cur_bikes = max(0, min(capacity, last_bikes + rng.randint(-2, 2)))
        cur_docks = capacity - cur_bikes
        cur_occ = round(cur_bikes / capacity, 4)
        cur_rows.append(
            CurStationStatus(
                station_id=station.id,
                ts=now,
                bikes_available=cur_bikes,
                docks_available=cur_docks,
                occupancy_rate=cur_occ,
                updated_at=now,
                is_renting=station.status == "active",
                is_returning=station.status == "active",
                is_installed=station.status != "closed",
                last_reported=now,
            )
        )

    session.add_all(history_rows)
    session.add_all(cur_rows)
    session.commit()


def _diurnal_occupancy(hour_f: float) -> float:
    """城市层面的 24h 占用率基线（0~1）.

    Cyber/通勤模型：
    - 早 8:30 高峰：很多人骑出 → 各站平均车少 → 占用率↓
    - 晚 18:00 高峰：再次出行 → 占用率↓
    - 凌晨/深夜：人不动 → 占用率高位（车都停在桩里）
    曲线由两个高斯下凹叠加在 0.78 基线上得到，范围约 0.46 ~ 0.78。
    """
    morning_dip = math.exp(-((hour_f - 8.5) ** 2) / 6.0)
    evening_dip = math.exp(-((hour_f - 18.0) ** 2) / 8.0)
    return 0.78 - 0.30 * morning_dip - 0.22 * evening_dip


def _seed_alerts(session: Session, rng: random.Random, stations: list[Station]) -> None:
    now = _utcnow_naive()
    for i in range(_ALERT_TOTAL):
        station = rng.choice(stations)
        level = rng.choices(_ALERT_LEVELS, weights=[0.4, 0.4, 0.2], k=1)[0]
        alert_type = rng.choice(_ALERT_TYPES)
        status = rng.choice(_ALERT_STATUSES)
        created_at = now - timedelta(minutes=rng.randint(1, 60 * 24))
        ack_at = (
            created_at + timedelta(minutes=rng.randint(5, 120))
            if status in ("ack", "resolved")
            else None
        )
        resolved_at = (
            (ack_at or created_at) + timedelta(minutes=rng.randint(5, 120))
            if status == "resolved"
            else None
        )
        session.add(
            Alert(
                station_id=station.id,
                region_id=station.region_id,
                level=level,
                type=alert_type,
                title=_alert_title(alert_type, station.name),
                message=_alert_message(alert_type, level),
                status=status,
                created_at=created_at,
                ack_at=ack_at,
                resolved_at=resolved_at,
            )
        )
    session.commit()


def _alert_title(alert_type: str, station_name: str) -> str:
    table = {
        "empty": f"{station_name} 空车风险",
        "full": f"{station_name} 满桩风险",
        "offline": f"{station_name} 离线",
        "anomaly": f"{station_name} 数据异常",
        "etl_fail": "ETL 抓取失败",
    }
    return table.get(alert_type, "未分类告警")


def _alert_message(alert_type: str, level: str) -> str:
    base = {
        "empty": "该站点可借车数量过低，需调度补车。",
        "full": "该站点桩位接近满载，需调度疏车。",
        "offline": "站点状态上报中断，请检查通讯链路。",
        "anomaly": "可借车数量出现异常波动，需人工核查。",
        "etl_fail": "GBFS feed 抓取失败，请检查数据源连通性。",
    }.get(alert_type, "未分类告警，请检查。")
    return f"[{level.upper()}] {base}"


def _seed_data_sources_and_feeds(
    session: Session, rng: random.Random
) -> list[GbfsFeed]:
    sources_def = [
        ("CN-MOCK", "中国 Mock 数据源", "mock-cn", "北京/上海/纽约", None),
        ("US-CITIBIKE", "Citi Bike (NYC)", "citibike", "New York", "https://gbfs.citibikenyc.com/gbfs/gbfs.json"),
        ("US-BAYWHEELS", "Bay Wheels (SF)", "baywheels", "San Francisco", "https://gbfs.baywheels.com/gbfs/gbfs.json"),
    ]
    feeds_per_source = [
        ("station_information", "{base}/en/station_information.json"),
        ("station_status", "{base}/en/station_status.json"),
    ]

    sources: list[DataSource] = []
    for code, name, provider, city, url in sources_def:
        ds = DataSource(code=code, name=name, provider=provider, city=city, gbfs_url=url, enabled=True)
        session.add(ds)
        sources.append(ds)
    session.commit()
    for s in sources:
        session.refresh(s)

    feeds: list[GbfsFeed] = []
    for ds in sources:
        for feed_name, url_tpl in feeds_per_source:
            base = ds.gbfs_url.rsplit("/", 1)[0] if ds.gbfs_url else f"mock://{ds.code}"
            feeds.append(
                GbfsFeed(
                    source_id=ds.id,
                    feed_name=feed_name,
                    url=url_tpl.format(base=base),
                    last_updated=_utcnow_naive(),
                )
            )
    session.add_all(feeds)
    session.commit()
    for f in feeds:
        session.refresh(f)
    return feeds


def _seed_fetch_logs(session: Session, rng: random.Random, feeds: list[GbfsFeed]) -> None:
    now = _utcnow_naive()
    for feed in feeds:
        for i in range(5):
            started = now - timedelta(minutes=15 * i + rng.randint(0, 5))
            duration_ms = rng.randint(120, 1800)
            success = rng.random() > 0.15
            session.add(
                FetchLog(
                    feed_id=feed.id,
                    started_at=started,
                    finished_at=started + timedelta(milliseconds=duration_ms),
                    status="success" if success else "failed",
                    records=rng.randint(80, 350) if success else 0,
                    duration_ms=duration_ms,
                    error=None if success else "Mock connection timeout",
                )
            )
    session.commit()


def seed_mock(session: Session | None = None) -> None:
    """装载 Mock 数据。空数据库时调用一次即可。"""
    rng = random.Random(42)

    own_session = session is None
    sess = session or Session(engine)
    try:
        regions = _seed_regions(sess, rng)
        stations = _seed_stations(sess, rng, regions)
        _seed_status_and_history(sess, rng, stations)
        _seed_alerts(sess, rng, stations)
        feeds = _seed_data_sources_and_feeds(sess, rng)
        _seed_fetch_logs(sess, rng, feeds)
        logger.info(
            "Mock seed 完成：%d regions, %d stations, %d alerts, %d feeds",
            len(regions),
            len(stations),
            _ALERT_TOTAL,
            len(feeds),
        )
    finally:
        if own_session:
            sess.close()
