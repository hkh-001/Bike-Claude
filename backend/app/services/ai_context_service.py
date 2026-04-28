"""AI 上下文服务：聚合当前系统实时数据，供 AI 助手 grounding 使用."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session

from app.services import dashboard_service


def build_context(session: Session) -> dict[str, Any]:
    """构建系统实时数据上下文摘要.

    聚合 dashboard_service 的 KPI、风险站点、最近告警、ETL 健康数据，
    序列化为 JSON 后注入 Kimi system prompt，确保 AI 回答基于真实数据。
    """
    kpi = dashboard_service.get_kpi(session)
    risks = dashboard_service.get_risks(session, limit_per_type=5)
    alerts = dashboard_service.get_recent_alerts(session, limit=5)
    etl = dashboard_service.get_etl_health(session)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "kpi": {
            "total_stations": kpi.total_stations,
            "active_stations": kpi.active_stations,
            "total_bikes_available": kpi.total_bikes_available,
            "total_docks_available": kpi.total_docks_available,
            "avg_occupancy_rate": round(kpi.avg_occupancy_rate * 100, 2),
            "alerts": {
                "info": kpi.alerts.info,
                "warning": kpi.alerts.warning,
                "critical": kpi.alerts.critical,
                "total": kpi.alerts.info + kpi.alerts.warning + kpi.alerts.critical,
            },
            "last_updated": (
                kpi.last_updated.isoformat() if kpi.last_updated else None
            ),
        },
        "risk_stations": {
            "empty": [
                {
                    "station_code": r.code,
                    "name": r.name,
                    "region": r.region_name,
                    "bikes_available": r.bikes_available,
                    "occupancy_rate": round(r.occupancy_rate * 100, 2),
                }
                for r in risks.empty_risks[:5]
            ],
            "full": [
                {
                    "station_code": r.code,
                    "name": r.name,
                    "region": r.region_name,
                    "bikes_available": r.bikes_available,
                    "occupancy_rate": round(r.occupancy_rate * 100, 2),
                }
                for r in risks.full_risks[:5]
            ],
        },
        "recent_alerts": [
            {
                "level": a.level,
                "type": a.type,
                "title": a.title,
                "station_code": a.station_code,
                "region_code": a.region_code,
                "created_at": (
                    a.created_at.isoformat() if a.created_at else None
                ),
            }
            for a in alerts[:5]
        ],
        "etl_health": [
            {
                "feed_name": e.feed_name,
                "source_name": e.source_name,
                "last_status": e.last_status,
                "recent_failures": e.recent_failures,
            }
            for e in etl
        ],
    }
