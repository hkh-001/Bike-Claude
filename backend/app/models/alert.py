"""告警与告警规则."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Alert(SQLModel, table=True):
    """运营告警."""

    __tablename__ = "alert"

    id: Optional[int] = Field(default=None, primary_key=True)
    station_id: Optional[int] = Field(default=None, foreign_key="station.id", index=True)
    region_id: Optional[int] = Field(default=None, foreign_key="region.id", index=True)
    level: str = Field(index=True, description="info / warning / critical")
    type: str = Field(index=True, description="empty / full / offline / anomaly / etl_fail")
    title: str
    message: str
    status: str = Field(default="open", index=True, description="open / ack / resolved")
    created_at: datetime = Field(default_factory=_utcnow, index=True)
    ack_at: Optional[datetime] = Field(default=None)
    resolved_at: Optional[datetime] = Field(default=None)


class AlertRule(SQLModel, table=True):
    """告警规则配置（M5 阶段使用）."""

    __tablename__ = "alert_rule"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(unique=True)
    threshold: float = Field(default=0.0)
    enabled: bool = Field(default=True)
    description: Optional[str] = Field(default=None)
