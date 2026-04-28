"""数据源：GBFS provider 配置."""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class DataSource(SQLModel, table=True):
    """GBFS 数据源."""

    __tablename__ = "data_source"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    name: str
    provider: str = Field(description="如 Citi Bike / Bay Wheels / 自定义")
    city: Optional[str] = Field(default=None, description="城市名称")
    gbfs_url: Optional[str] = Field(default=None, description="GBFS auto-discovery URL")
    enabled: bool = Field(default=True)
