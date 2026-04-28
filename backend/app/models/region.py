"""区域：城市内的运营网格 / 行政区."""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class Region(SQLModel, table=True):
    """运营区域。

    正式方案（Postgres+PostGIS）：
    - ``geo_polygon`` 改为 ``geometry(Polygon, 4326)`` 列，配合 GIST 索引
    - 区域包含查询用 ``ST_Contains(region.geo_polygon, station.location)``

    开发期（SQLite）：``geo_polygon`` 存 GeoJSON 字符串。
    """

    __tablename__ = "region"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, description="区域编码，如 BJ-CY")
    name: str = Field(description="区域显示名称")
    city: str = Field(index=True, description="所属城市")
    geo_polygon: Optional[str] = Field(default=None, description="GeoJSON Polygon 字符串（正式方案改为 PostGIS geometry 列）")
