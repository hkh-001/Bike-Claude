"""GBFS feed：station_information / station_status 等子源."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class GbfsFeed(SQLModel, table=True):
    """单个 GBFS feed（如 station_status、station_information）."""

    __tablename__ = "gbfs_feed"

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="data_source.id", index=True)
    feed_name: str = Field(index=True, description="如 station_status / station_information")
    url: str
    last_updated: Optional[datetime] = Field(default=None)
