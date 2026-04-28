"""日志初始化：屏蔽任何 ``sk-`` 前缀字符串，避免 API key 意外泄露到日志."""

from __future__ import annotations

import logging
import re
import sys

_SK_PATTERN = re.compile(r"sk-[A-Za-z0-9_\-]{6,}")


class _RedactSecretsFilter(logging.Filter):
    """将 log message 中的 ``sk-xxx`` 替换为 ``sk-***REDACTED***``."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
        except Exception:
            return True
        if "sk-" in msg:
            redacted = _SK_PATTERN.sub("sk-***REDACTED***", msg)
            record.msg = redacted
            record.args = ()
        return True


def setup_logging(level: int = logging.INFO) -> None:
    """在应用启动时调用一次：配置根 logger 并安装屏蔽过滤器."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    handler.addFilter(_RedactSecretsFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
