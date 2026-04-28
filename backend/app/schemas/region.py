"""区域相关 schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class RegionOut(BaseModel):
    id: int
    code: str
    name: str
    city: str
    station_count: int


class RegionTrendPoint(BaseModel):
    ts: datetime
    total_bikes: int
    avg_occupancy: float
