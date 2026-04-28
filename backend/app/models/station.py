"""站点：地理上的取还车点（静态信息）."""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class Station(SQLModel, table=True):
    """站点静态信息。

    正式方案（Postgres+PostGIS）：
    - 在 ``(lat, lng)`` 之外引入 ``location: geometry(Point, 4326)`` 列 + GIST 索引
    - KNN 邻近站点用 ``ST_DWithin(location, :origin, :radius)`` 与 ``<->`` 距离算子排序
    """

    __tablename__ = "station"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, description="外部站点编码（GBFS station_id）")
    source_system: str = Field(default="mock", index=True, description="数据来源系统编码")
    region_id: Optional[int] = Field(default=None, foreign_key="region.id", index=True)
    name: str = Field(description="站点名称")
    lat: float = Field(description="纬度（WGS84）")
    lng: float = Field(description="经度（WGS84）")
    capacity: int = Field(default=0, description="总桩位容量")
    status: str = Field(default="active", description="active / maintenance / closed")
