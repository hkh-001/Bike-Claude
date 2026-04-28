"""告警相关 schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AlertOut(BaseModel):
    id: int
    level: str
    type: str
    title: str
    message: str
    status: str
    station_id: Optional[int]
    station_code: Optional[str]
    region_id: Optional[int]
    region_code: Optional[str]
    created_at: datetime
    ack_at: Optional[datetime]
    resolved_at: Optional[datetime]
