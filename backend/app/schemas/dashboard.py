"""Dashboard 响应 schemas（首页大屏 / 多功能平台共用）."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class AlertCountByLevel(BaseModel):
    info: int = 0
    warning: int = 0
    critical: int = 0


class DashboardKPI(BaseModel):
    total_stations: int
    active_stations: int
    total_bikes_available: int
    total_docks_available: int
    avg_occupancy_rate: float = Field(description="0-1 小数")
    alerts: AlertCountByLevel
    # system_updated_at: 本系统最近一次成功抓取并入库时间（推荐用于"最近抓取"展示）
    system_updated_at: Optional[datetime] = Field(
        default=None, description="系统最近一次成功 ETL 抓取时间（fetch_log.finished_at）"
    )
    # source_reported_at: GBFS 官方 station_status.last_reported 的最大值
    source_reported_at: Optional[datetime] = Field(
        default=None, description="GBFS 官方最近上报时间（cur_station_status.last_reported max）"
    )
    # last_updated 保持兼容旧前端，等于 system_updated_at
    last_updated: Optional[datetime] = Field(
        default=None, description="兼容字段，同 system_updated_at"
    )


class RegionRankingItem(BaseModel):
    region_id: int
    code: str
    name: str
    city: str
    station_count: int
    bikes_total: int
    avg_occupancy: float
    open_alerts: int


class RiskStationItem(BaseModel):
    station_id: int
    code: str
    name: str
    region_code: Optional[str]
    region_name: Optional[str]
    lat: float
    lng: float
    capacity: int
    bikes_available: int
    docks_available: int
    occupancy_rate: float
    risk_type: str = Field(description="empty / full")


class RecentAlertItem(BaseModel):
    id: int
    level: str
    type: str
    title: str
    message: str
    status: str
    station_code: Optional[str]
    station_name: Optional[str]
    region_code: Optional[str]
    region_name: Optional[str]
    created_at: datetime


class EtlFeedHealth(BaseModel):
    feed_id: int
    feed_name: str
    source_name: str
    last_status: Optional[str]
    last_started_at: Optional[datetime]
    last_duration_ms: Optional[int]
    last_error: Optional[str]
    recent_failures: int


class OperationalAreaRankingItem(BaseModel):
    area_id: str
    area_name: str
    center_lat: float
    center_lon: float
    station_count: int
    bikes_total: int
    docks_total: int
    capacity_total: int
    avg_occupancy: float


class GridRegionItem(BaseModel):
    """经纬度网格运营片区统计项."""

    grid_code: str = Field(description="网格编码，如 40.73N-73.99W")
    label: str = Field(description="人类可读标签，如 40.73°N, 73.99°W")
    station_count: int
    available_bikes: int
    avg_occupancy_rate: float = Field(description="0~1 小数")
    capacity: int
    alert_count: int = 0


class GridRegionsResponse(BaseModel):
    items: list[GridRegionItem]


class DashboardSummary(BaseModel):
    kpi: DashboardKPI
    region_ranking: list[RegionRankingItem]
    operational_area_ranking: list[OperationalAreaRankingItem]
    risk_stations: list[RiskStationItem]
    recent_alerts: list[RecentAlertItem]
    etl_health: list[EtlFeedHealth]


class RisksResponse(BaseModel):
    empty_risks: list[RiskStationItem]
    full_risks: list[RiskStationItem]


# ---------------------------------------------------------------------------
# GeoJSON: 站点散点图（M2.2-A）
#
# 输出符合 RFC 7946 GeoJSON FeatureCollection。
# 注意 coordinates 顺序为 [lng, lat]（GeoJSON 规范）。
# ---------------------------------------------------------------------------


RiskTypeName = Literal["normal", "empty", "full", "offline", "abnormal"]


class StationGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(
        description="[lng, lat]（GeoJSON 规范要求经度在前）"
    )


class StationGeoProperties(BaseModel):
    """站点 Feature 的 properties，供前端 MapLibre 圆点渲染 + popup."""

    station_id: int
    station_code: str
    name: str
    region_name: Optional[str]
    capacity: int
    bikes_available: int
    docks_available: int
    occupancy_rate: float = Field(description="0~1 小数")
    risk_type: RiskTypeName = Field(
        description="normal / empty / full / offline / abnormal"
    )
    status: str = Field(description="station.status: active / maintenance / closed")
    updated_at: Optional[datetime]


class StationGeoFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: StationGeometry
    properties: StationGeoProperties


class StationGeoFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[StationGeoFeature]


# ---------------------------------------------------------------------------
# 24h 时序趋势（M2.2-B）
# ---------------------------------------------------------------------------


class TrendBucket(BaseModel):
    """城市层面每小时 1 个桶."""

    ts: datetime
    city_total_bikes: int = Field(description="该小时所有站点 bikes 之和")
    city_avg_occupancy: float = Field(description="该小时所有站点占用率算术平均，0~1")
    alerts_count: int = Field(description="该小时内创建（created_at 命中桶）的告警数")


class TrendRegionPoint(BaseModel):
    ts: datetime
    bikes_available: int
    avg_occupancy: float = Field(description="0~1 小数")


class TrendRegionSeries(BaseModel):
    region_code: str
    region_name: str
    points: list[TrendRegionPoint]


class DashboardTrend24h(BaseModel):
    range: Literal["24h"] = "24h"
    interval: Literal["1h"] = "1h"
    buckets: list[TrendBucket]
    region_series: list[TrendRegionSeries]


# ---------------------------------------------------------------------------
# M5.1: 单站详情
# ---------------------------------------------------------------------------


class StationDetail(BaseModel):
    station_id: int
    station_code: str
    name: str
    region_code: Optional[str]
    region_name: Optional[str]
    lat: float
    lng: float
    capacity: int
    status: str
    bikes_available: int
    docks_available: int
    occupancy_rate: float = Field(description="0~1 小数")
    risk_type: RiskTypeName
    updated_at: Optional[datetime]


class StationHistoryPoint(BaseModel):
    ts: datetime
    bikes_available: int
    docks_available: int
    occupancy_rate: float = Field(description="0~1 小数")


class StationHistoryResponse(BaseModel):
    station_code: str
    range: Literal["24h"] = "24h"
    interval: Literal["1h"] = "1h"
    points: list[StationHistoryPoint]


class StationAlertItem(BaseModel):
    id: int
    level: str
    type: str
    title: str
    message: str
    status: str
    created_at: datetime


class StationAlertsResponse(BaseModel):
    station_code: str
    items: list[StationAlertItem]
