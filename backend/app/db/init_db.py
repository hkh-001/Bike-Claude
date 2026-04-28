"""数据库表创建与 Mock seed 触发."""

from __future__ import annotations

import logging

from sqlmodel import SQLModel, Session, select

from app.core.config import settings
from app.db.session import engine
from app.models.station import Station

logger = logging.getLogger(__name__)


def _import_all_models() -> None:
    """显式导入所有模型，确保 ``SQLModel.metadata`` 注册完整."""
    # 这些 import 仅用于副作用（注册 SQLModel 元数据）
    # noqa: F401
    from app.models import (  # noqa: F401
        alert,
        cur_station_status,
        data_source,
        fact_station_snapshot,
        fetch_log,
        gbfs_feed,
        region,
        station,
    )


def init_db() -> None:
    """创建所有表，必要时触发 Mock seed."""
    _import_all_models()
    SQLModel.metadata.create_all(engine)

    if not settings.seed_mock_on_startup:
        logger.info("Mock seed 已禁用，跳过。")
        return

    with Session(engine) as session:
        existing = session.exec(select(Station).limit(1)).first()
        if existing is not None:
            logger.info("数据库已有数据，跳过 Mock seed。")
            return

    # 延迟导入避免循环
    from app.mock.seed import seed_mock

    logger.info("数据库为空，开始装载 Mock 数据...")
    seed_mock()
    logger.info("Mock 数据装载完毕。")
