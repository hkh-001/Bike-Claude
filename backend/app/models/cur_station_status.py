"""``cur_station_status`` — 当前状态表（每站 1 行）.

被 ETL 流水持续 upsert，Dashboard、地图、风险检测都直接读这张表。
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class CurStationStatus(SQLModel, table=True):
    """当前状态表：每个站点对应唯一一行."""

    __tablename__ = "cur_station_status"

    station_id: int = Field(
        primary_key=True,
        foreign_key="station.id",
        description="主键 = 站点外键，每站 1 行",
    )
    ts: datetime = Field(default_factory=_utcnow, description="此条状态的观测时间（UTC）")
    bikes_available: int = Field(default=0, description="可借车辆数")
    docks_available: int = Field(default=0, description="可还桩位数")
    occupancy_rate: float = Field(default=0.0, description="占用率 = bikes / capacity")
    updated_at: datetime = Field(default_factory=_utcnow, description="行更新时间")
    is_renting: bool = Field(default=True, description="是否允许借车")
    is_returning: bool = Field(default=True, description="是否允许还车")
    is_installed: bool = Field(default=True, description="站点是否已安装/运营")
    last_reported: Optional[datetime] = Field(default=None, description="上游 GBFS 上报时间")
