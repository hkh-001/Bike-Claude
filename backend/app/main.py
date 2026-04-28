"""FastAPI 应用入口."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import routes_ai, routes_dashboard, routes_etl, routes_health
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.init_db import init_db
from app.services.scheduler_service import start_scheduler, stop_scheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    init_db()
    start_scheduler()
    logger.info("Backend ready · version=%s", __version__)
    yield
    stop_scheduler()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="共享单车时空出行监控与运营分析平台 - 后端 API",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(routes_health.router, prefix="/api")
    application.include_router(routes_dashboard.router, prefix="/api/dashboard")
    application.include_router(routes_ai.router, prefix="/api/ai")
    application.include_router(routes_etl.router, prefix="/api/etl")

    return application


app = create_app()
# reload trigger
