"""``app.core.secrets`` 单元测试：覆盖文件存在/缺失/空文件三态."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.core.secrets import ApiKeyError, has_kimi_api_key, read_kimi_api_key


def test_read_key_success(tmp_apikey_file: Path) -> None:
    tmp_apikey_file.write_text("sk-fake-test-key-12345", encoding="utf-8")
    assert read_kimi_api_key(custom_path=tmp_apikey_file) == "sk-fake-test-key-12345"


def test_read_key_strips_whitespace(tmp_apikey_file: Path) -> None:
    tmp_apikey_file.write_text("  sk-fake-key-with-padding  \n", encoding="utf-8")
    assert read_kimi_api_key(custom_path=tmp_apikey_file) == "sk-fake-key-with-padding"


def test_read_key_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "no-such-apikey.txt"
    with pytest.raises(ApiKeyError) as exc_info:
        read_kimi_api_key(custom_path=missing)
    assert "未找到" in str(exc_info.value)


def test_read_key_empty_file(tmp_apikey_file: Path) -> None:
    tmp_apikey_file.write_text("   \n  ", encoding="utf-8")
    with pytest.raises(ApiKeyError) as exc_info:
        read_kimi_api_key(custom_path=tmp_apikey_file)
    assert "为空" in str(exc_info.value)


def test_has_key_returns_false_when_missing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """has_kimi_api_key 在缺失时不抛异常，返回 False."""
    # 临时把项目根指向 tmp_path（无 apikey.txt）
    from app.core import secrets as secrets_module

    monkeypatch.setattr(
        "app.core.secrets.project_root",
        lambda: tmp_path,
    )
    assert secrets_module.has_kimi_api_key() is False
