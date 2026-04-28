"""Kimi/Moonshot API key 安全读取。

硬约束：
- API key 文件位于项目根目录 ``apikey.txt``
- 不允许硬编码、不允许日志输出明文 key
- 文件不存在或为空时抛出清晰错误
"""

from __future__ import annotations

from pathlib import Path

from app.core.config import project_root


class ApiKeyError(RuntimeError):
    """读取 API key 失败的统一异常类型."""


def read_kimi_api_key(custom_path: Path | None = None) -> str:
    """从项目根目录的 ``apikey.txt`` 读取 Kimi/Moonshot API key.

    Args:
        custom_path: 可选自定义路径，主要用于测试注入。

    Returns:
        清理空白后的 API key 字符串。

    Raises:
        ApiKeyError: 文件不存在或内容为空。
    """
    key_path = custom_path or (project_root() / "apikey.txt")

    if not key_path.exists():
        raise ApiKeyError(
            f"apikey.txt 未找到：期望路径 {key_path}。请把 Kimi/Moonshot API key 保存到该文件。"
        )

    api_key = key_path.read_text(encoding="utf-8").strip()

    if not api_key:
        raise ApiKeyError(
            f"apikey.txt 为空：路径 {key_path}。请确认文件内已写入 API key。"
        )

    return api_key


def has_kimi_api_key() -> bool:
    """非异常版：仅探测 key 是否就绪，不返回内容，不抛异常."""
    try:
        read_kimi_api_key()
        return True
    except ApiKeyError:
        return False
