"""Dashboard 路由：``/api/dashboard/{summary,kpi,risks,stations/geojson,trends/24h}`` + M4 功能页扩展."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.dashboard import (
    DashboardKPI,
    DashboardSummary,
    DashboardTrend24h,
    EtlFeedHealth,
    GridRegionItem,
    GridRegionsResponse,
    RecentAlertItem,
    RegionRankingItem,
    RisksResponse,
    RiskStationItem,
    StationAlertsResponse,
    StationDetail,
    StationGeoFeatureCollection,
    StationHistoryResponse,
)
from app.services import dashboard_service

router = APIRouter(tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary, summary="首页大屏汇总")
def summary(session: Session = Depends(get_session)) -> DashboardSummary:
    return dashboard_service.get_summary(session)


@router.get("/kpi", response_model=DashboardKPI, summary="核心 KPI")
def kpi(session: Session = Depends(get_session)) -> DashboardKPI:
    return dashboard_service.get_kpi(session)


@router.get("/risks", response_model=RisksResponse, summary="空车 / 满桩风险站点")
def risks(session: Session = Depends(get_session)) -> RisksResponse:
    return dashboard_service.get_risks(session, limit_per_type=10)


@router.get(
    "/stations/geojson",
    response_model=StationGeoFeatureCollection,
    summary="首页大屏 · 站点散点图（GeoJSON FeatureCollection）",
)
def stations_geojson(
    session: Session = Depends(get_session),
) -> StationGeoFeatureCollection:
    return dashboard_service.get_stations_geojson(session)


@router.get(
    "/trends/24h",
    response_model=DashboardTrend24h,
    summary="首页大屏 · 24 小时时序趋势（每小时桶 × 城市 + Top 3 区域）",
)
def trends_24h(session: Session = Depends(get_session)) -> DashboardTrend24h:
    return dashboard_service.get_dashboard_trends_24h(session)


# ---------------------------------------------------------------------------
# M4：多功能页面扩展端点
# ---------------------------------------------------------------------------


@router.get("/regions", response_model=list[RegionRankingItem], summary="全部区域列表")
def regions(session: Session = Depends(get_session)) -> list[RegionRankingItem]:
    return dashboard_service.get_regions(session)


@router.get("/regions/grid", response_model=GridRegionsResponse, summary="经纬度网格运营片区")
def grid_regions(session: Session = Depends(get_session)) -> GridRegionsResponse:
    """基于站点经纬度网格划分的运营片区统计（复用首页 operational_area_ranking 逻辑）."""
    areas = dashboard_service.get_operational_area_ranking(session, limit=50)
    items = [
        GridRegionItem(
            grid_code=a.area_id,
            label=a.area_name,
            station_count=a.station_count,
            available_bikes=a.bikes_total,
            avg_occupancy_rate=float(round(a.avg_occupancy, 4)),
            capacity=a.capacity_total,
            alert_count=0,
        )
        for a in areas
    ]
    return GridRegionsResponse(items=items)


@router.get("/stations", response_model=list[RiskStationItem], summary="全部站点列表")
def stations(
    session: Session = Depends(get_session),
    risk_type: Literal["normal", "empty", "full", "offline", "abnormal"] | None = None,
) -> list[RiskStationItem]:
    return dashboard_service.get_stations(session, risk_type=risk_type)


@router.get("/alerts", response_model=list[RecentAlertItem], summary="告警列表")
def alerts(
    session: Session = Depends(get_session),
    level: Literal["info", "warning", "critical"] | None = None,
    status: str = Query(default="open"),
    limit: int = Query(default=100, ge=1, le=500),
    mode: Literal["real", "mock"] = Query(default="real"),
) -> list[RecentAlertItem]:
    return dashboard_service.get_alerts(session, level=level, status=status, limit=limit, mode=mode)


@router.get("/etl/health", response_model=list[EtlFeedHealth], summary="ETL Feed 健康状态")
def etl_health(session: Session = Depends(get_session)) -> list[EtlFeedHealth]:
    return dashboard_service.get_etl_health(session)


# ---------------------------------------------------------------------------
# M5.1: 单站详情
# ---------------------------------------------------------------------------


@router.get(
    "/stations/{code}",
    response_model=StationDetail,
    summary="单站详情（静态信息 + 当前状态）",
)
def station_detail(code: str, session: Session = Depends(get_session)) -> StationDetail:
    detail = dashboard_service.get_station_detail(session, code)
    if detail is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"站点 {code} 不存在")
    return detail


@router.get(
    "/stations/{code}/history",
    response_model=StationHistoryResponse,
    summary="单站历史趋势（最近 24h 快照）",
)
def station_history(
    code: str,
    hours: int = Query(default=24, ge=1, le=168),
    session: Session = Depends(get_session),
) -> StationHistoryResponse:
    history = dashboard_service.get_station_history(session, code, hours=hours)
    if history is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"站点 {code} 不存在")
    return history


@router.get(
    "/stations/{code}/alerts",
    response_model=StationAlertsResponse,
    summary="单站相关告警",
)
def station_alerts(
    code: str,
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> StationAlertsResponse:
    alerts = dashboard_service.get_station_alerts(session, code, limit=limit)
    if alerts is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"站点 {code} 不存在")
    return alerts
