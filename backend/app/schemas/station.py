"""站点相关 schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StationOut(BaseModel):
    id: int
    code: str
    name: str
    region_id: Optional[int]
    region_code: Optional[str]
    region_name: Optional[str]
    lat: float
    lng: float
    capacity: int
    status: str


class StationStatusOut(BaseModel):
    station_id: int
    ts: datetime
    bikes_available: int
    docks_available: int
    occupancy_rate: float
    is_renting: bool
    is_returning: bool


class StationSnapshotPoint(BaseModel):
    ts: datetime
    bikes: int
    docks: int
    occupancy_rate: float
