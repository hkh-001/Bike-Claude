"""SQLModel engine 与 session 依赖.

切换到 PostgreSQL+PostGIS 时只需修改 ``DATABASE_URL`` 环境变量；
SQLModel 兼容两者，正式方案需额外配置 alembic 迁移与 PostGIS 列类型。
"""

from __future__ import annotations

import os
from typing import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings


def _resolve_database_url() -> str:
    """优先环境变量，便于测试覆盖."""
    return os.environ.get("DATABASE_URL", settings.database_url)


_database_url = _resolve_database_url()
_engine_kwargs: dict[str, object] = {}

if _database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(_database_url, echo=False, **_engine_kwargs)


def get_session() -> Generator[Session, None, None]:
    """FastAPI 依赖：每请求一会话."""
    with Session(engine) as session:
        yield session
