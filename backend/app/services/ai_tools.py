"""AI 本地工具：让 Kimi 能调用后端真实数据."""

from __future__ import annotations

from typing import Any

from sqlmodel import Session

from app.services import dashboard_service


TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_kpi_summary",
            "description": (
                "获取当前平台 KPI 摘要，包括站点总数、活跃站点数、"
                "可用车辆数、可用桩位数、平均占用率、各级别告警数量"
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_station_risks",
            "description": (
                "获取当前需要优先处理的风险站点列表，"
                "包括空车风险（可借车辆太少）和满桩风险（占用率太高、无法还车）"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "risk_type": {
                        "type": "string",
                        "enum": ["empty", "full", "both"],
                        "description": (
                            "风险类型：empty=空车风险, full=满桩风险, both=两者都要"
                        ),
                    },
                    "limit": {
                        "type": "integer",
                        "description": "每种类型返回的最大数量，默认 5",
                        "default": 5,
                    },
                },
                "required": ["risk_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_alerts",
            "description": "获取最近的系统告警列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "enum": ["info", "warning", "critical"],
                        "description": "告警级别过滤，不传则返回所有级别",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回的最大数量，默认 5",
                        "default": 5,
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_station_detail",
            "description": (
                "查询单个站点的实时详细信息，包括当前可用车、可用桩、占用率、风险状态等。"
                "支持通过站点 code（如 BJ-CY-S001）或站点名称（如 朝阳区-001）查询。"
                "如果名称模糊匹配到多个站点，会返回候选列表供用户选择。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "code_or_name": {
                        "type": "string",
                        "description": "站点 code 或站点名称（支持模糊匹配）",
                    },
                },
                "required": ["code_or_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_station_capacity_ranking",
            "description": (
                "获取站点容量排行，用于回答'哪个站点容量最大'等问题"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "返回数量，默认 10",
                        "default": 10,
                    },
                    "order": {
                        "type": "string",
                        "enum": ["asc", "desc"],
                        "description": "排序方向，默认 desc（容量从大到小）",
                        "default": "desc",
                    },
                },
                "required": [],
            },
        },
    },
]


def get_kpi_summary(session: Session) -> dict[str, Any]:
    kpi = dashboard_service.get_kpi(session)
    return {
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
    }


def get_station_risks(
    session: Session, risk_type: str = "both", limit: int = 5
) -> dict[str, Any]:
    risks = dashboard_service.get_risks(session, limit_per_type=limit)
    result: dict[str, Any] = {"risk_type": risk_type}

    if risk_type in ("empty", "both"):
        result["empty_risks"] = [
            {
                "station_code": r.code,
                "name": r.name,
                "region": r.region_name,
                "bikes_available": r.bikes_available,
                "docks_available": r.docks_available,
                "occupancy_rate": round(r.occupancy_rate * 100, 2),
                "capacity": r.capacity,
            }
            for r in risks.empty_risks
        ]
    if risk_type in ("full", "both"):
        result["full_risks"] = [
            {
                "station_code": r.code,
                "name": r.name,
                "region": r.region_name,
                "bikes_available": r.bikes_available,
                "docks_available": r.docks_available,
                "occupancy_rate": round(r.occupancy_rate * 100, 2),
                "capacity": r.capacity,
            }
            for r in risks.full_risks
        ]
    return result


def get_recent_alerts(
    session: Session, level: str | None = None, limit: int = 5
) -> dict[str, Any]:
    alerts = dashboard_service.get_recent_alerts(session, limit=limit)
    if level:
        alerts = [a for a in alerts if a.level == level]
    return {
        "alerts": [
            {
                "id": a.id,
                "level": a.level,
                "type": a.type,
                "title": a.title,
                "message": a.message,
                "station_code": a.station_code,
                "region_code": a.region_code,
                "created_at": (
                    a.created_at.isoformat() if a.created_at else None
                ),
            }
            for a in alerts
        ],
        "count": len(alerts),
        "filter_level": level,
    }


def get_station_detail(session: Session, code_or_name: str) -> dict[str, Any]:
    """查询单个站点详情：先精确匹配 code，再模糊匹配 name。"""
    # 1) 精确 code 匹配
    detail = dashboard_service.get_station_detail(session, code_or_name)
    if detail:
        return _build_station_result(detail)

    # 2) 模糊 name 匹配
    all_stations = dashboard_service.get_stations(session)
    keyword = code_or_name.lower()
    matches = [
        s for s in all_stations
        if keyword in s.name.lower() or keyword in s.code.lower()
    ]

    if not matches:
        return {
            "found": False,
            "query": code_or_name,
            "message": f"未找到站点 '{code_or_name}'，请检查站点 code 或名称。",
        }

    if len(matches) == 1:
        # 唯一匹配，直接返回详情
        single = matches[0]
        # 需要 region_name，但 get_stations 返回的是 RiskStationItem，已有 region_name
        return _build_station_result_from_risk_item(single)

    # 多个匹配，返回候选列表
    return {
        "found": False,
        "query": code_or_name,
        "multiple_matches": True,
        "candidates": [
            {
                "station_code": s.code,
                "name": s.name,
                "region_name": s.region_name,
                "capacity": s.capacity,
            }
            for s in matches[:10]
        ],
        "message": (
            f"找到 {len(matches)} 个匹配站点，请提供更精确的站点 code "
            f"（如 {matches[0].code}）以便查询详情。"
        ),
    }


def _build_station_result(detail: Any) -> dict[str, Any]:
    """从 StationDetail schema 构建返回结果."""
    occ_pct = round(detail.occupancy_rate * 100, 2)
    is_full = detail.risk_type == "full" or detail.occupancy_rate >= 0.95
    is_empty = detail.risk_type == "empty" or detail.bikes_available <= 1
    is_offline = detail.risk_type == "offline" or detail.status == "closed"
    is_abnormal = detail.risk_type == "abnormal" or detail.status == "maintenance"

    recommendations: list[str] = []
    if is_offline:
        recommendations.append("站点离线，建议立即检查通讯链路和设备状态")
    elif is_abnormal:
        recommendations.append("站点异常，建议检查租车/还车功能是否正常")
    elif is_full:
        recommendations.append("满桩风险，建议清理桩位或暂停还车")
    elif is_empty:
        recommendations.append("空车风险，建议调度车辆补充")
    elif occ_pct > 80:
        recommendations.append("占用率较高，建议关注并准备调度")
    elif occ_pct < 30:
        recommendations.append("占用率较低，车辆可能过剩")
    else:
        recommendations.append("当前状态正常，保持监控")

    return {
        "found": True,
        "station_code": detail.station_code,
        "name": detail.name,
        "region_name": detail.region_name,
        "status": detail.status,
        "risk_type": detail.risk_type,
        "capacity": detail.capacity,
        "bikes_available": detail.bikes_available,
        "docks_available": detail.docks_available,
        "occupancy_rate": occ_pct,
        "updated_at": detail.updated_at.isoformat() if detail.updated_at else None,
        "is_full": is_full,
        "is_empty": is_empty,
        "is_offline": is_offline,
        "is_abnormal": is_abnormal,
        "recommendations": recommendations,
    }


def _build_station_result_from_risk_item(item: Any) -> dict[str, Any]:
    """从 RiskStationItem 构建返回结果（字段略少，但包含核心信息）."""
    occ_pct = round(item.occupancy_rate * 100, 2)
    is_full = item.risk_type == "full" or item.occupancy_rate >= 0.95
    is_empty = item.risk_type == "empty" or item.bikes_available <= 1
    is_offline = item.risk_type == "offline"
    is_abnormal = item.risk_type == "abnormal"

    recommendations: list[str] = []
    if is_offline:
        recommendations.append("站点离线，建议立即检查通讯链路和设备状态")
    elif is_abnormal:
        recommendations.append("站点异常，建议检查租车/还车功能是否正常")
    elif is_full:
        recommendations.append("满桩风险，建议清理桩位或暂停还车")
    elif is_empty:
        recommendations.append("空车风险，建议调度车辆补充")
    elif occ_pct > 80:
        recommendations.append("占用率较高，建议关注并准备调度")
    elif occ_pct < 30:
        recommendations.append("占用率较低，车辆可能过剩")
    else:
        recommendations.append("当前状态正常，保持监控")

    return {
        "found": True,
        "station_code": item.code,
        "name": item.name,
        "region_name": item.region_name,
        "status": item.risk_type,
        "risk_type": item.risk_type,
        "capacity": item.capacity,
        "bikes_available": item.bikes_available,
        "docks_available": item.docks_available,
        "occupancy_rate": occ_pct,
        "updated_at": None,
        "is_full": is_full,
        "is_empty": is_empty,
        "is_offline": is_offline,
        "is_abnormal": is_abnormal,
        "recommendations": recommendations,
    }


def get_station_capacity_ranking(
    session: Session, limit: int = 10, order: str = "desc"
) -> dict[str, Any]:
    """获取站点容量排行."""
    all_stations = dashboard_service.get_stations(session)
    sorted_stations = sorted(
        all_stations,
        key=lambda s: s.capacity,
        reverse=(order == "desc"),
    )
    top = sorted_stations[:limit]

    return {
        "order": order,
        "limit": limit,
        "total": len(all_stations),
        "stations": [
            {
                "rank": i + 1,
                "station_code": s.code,
                "name": s.name,
                "region_name": s.region_name,
                "capacity": s.capacity,
                "bikes_available": s.bikes_available,
                "occupancy_rate": round(s.occupancy_rate * 100, 2),
            }
            for i, s in enumerate(top)
        ],
    }


TOOL_REGISTRY: dict[str, Any] = {
    "get_kpi_summary": get_kpi_summary,
    "get_station_risks": get_station_risks,
    "get_recent_alerts": get_recent_alerts,
    "get_station_detail": get_station_detail,
    "get_station_capacity_ranking": get_station_capacity_ranking,
}
