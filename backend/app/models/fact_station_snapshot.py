"""``fact_station_snapshot`` — 历史快照事实表（时序，append-only）.

每次 ETL 抓取追加一行，用于 24h / 7d 趋势分析。
正式方案（Postgres）按 ``ts`` 做分区（PARTITION BY RANGE (ts)）。
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class FactStationSnapshot(SQLModel, table=True):
    """站点历史快照事实表."""

    __tablename__ = "fact_station_snapshot"

    id: Optional[int] = Field(default=None, primary_key=True)
    station_id: int = Field(foreign_key="station.id", index=True)
    ts: datetime = Field(index=True, description="观测时间（UTC）")
    bikes: int = Field(default=0, description="可借车辆数")
    docks: int = Field(default=0, description="可还桩位数")
    occupancy_rate: float = Field(default=0.0, description="占用率")
