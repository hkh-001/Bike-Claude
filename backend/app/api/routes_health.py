"""健康检查路由."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__

router = APIRouter(tags=["health"])


@router.get("/health", summary="健康检查")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "version": __version__,
    }
