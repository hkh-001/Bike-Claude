"""应用配置：从环境变量与默认值读取运行时设置."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Bike-Share Monitoring Platform"
    app_version: str = "0.1.0"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # 数据库：开发期 SQLite，正式方案 PostgreSQL+PostGIS（仅改此处即可切换）
    database_url: str = "sqlite:///./bike.db"

    # API key 文件路径：项目根目录的 apikey.txt
    # secrets.py 会用 Path(__file__).resolve().parents[3] 自动定位，无需在此配置
    # 若日后需自定义路径，可以加 api_key_path 字段并在 secrets.py 优先读它

    # Mock seed 开关：True 表示首次启动若数据库为空则装载 Mock 数据
    seed_mock_on_startup: bool = True


def _load_settings() -> Settings:
    return Settings()


settings = _load_settings()


def project_root() -> Path:
    """返回项目根目录（含 apikey.txt 的那一层）."""
    return Path(__file__).resolve().parents[3]
