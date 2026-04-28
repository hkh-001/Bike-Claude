"""GBFS (General Bikeshare Feed Specification) 客户端.

支持 GBFS v1.0 / v1.1 / v2.x / v3.0 的 auto-discovery 与核心 feed 拉取。
统一使用 naive UTC datetime（与现有模型保持一致）。
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


# ---------------------------------------------------------------------------
# 异常层级
# ---------------------------------------------------------------------------


class GbfsError(Exception):
    """GBFS 相关错误的基类."""

    pass


class GbfsTimeoutError(GbfsError):
    """请求超时."""

    pass


class GbfsHttpError(GbfsError):
    """HTTP 非 200."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


class GbfsFeedNotFoundError(GbfsError):
    """在 auto-discovery 中找不到指定 feed."""

    pass


class GbfsParseError(GbfsError):
    """JSON 解析失败或结构不符合预期."""

    pass


# ---------------------------------------------------------------------------
# 数据载体
# ---------------------------------------------------------------------------


@dataclass
class StationInfo:
    station_id: str
    name: str
    lat: float
    lon: float
    capacity: int
    region_id: str | None = None
    short_name: str | None = None


@dataclass
class StationStatus:
    station_id: str
    num_bikes_available: int
    num_docks_available: int
    is_renting: bool
    is_returning: bool
    is_installed: bool
    last_reported: datetime | None = None


@dataclass
class SystemRegion:
    region_id: str
    name: str


# ---------------------------------------------------------------------------
# 内部 helper
# ---------------------------------------------------------------------------


def _now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        return value.lower() in ("true", "1", "yes")
    return False


def _parse_last_reported(value: Any) -> datetime | None:
    if value is None:
        return None
    try:
        ts = int(value)
        if ts < 1_000_000_000_000:  # 秒级时间戳
            return datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
        else:  # 毫秒级时间戳（防御）
            return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).replace(tzinfo=None)
    except (ValueError, TypeError, OSError):
        return None


# ---------------------------------------------------------------------------
# 核心函数
# ---------------------------------------------------------------------------


def fetch_gbfs_discovery(url: str) -> dict[str, Any]:
    """拉取 GBFS auto-discovery (gbfs.json)，返回解析后的 dict.

    Raises:
        GbfsTimeoutError: 连接/读取超时
        GbfsHttpError: HTTP 状态码非 2xx
        GbfsParseError: JSON 解析失败
    """
    try:
        with httpx.Client(
            timeout=_DEFAULT_TIMEOUT, follow_redirects=True, trust_env=False
        ) as client:
            resp = client.get(url)
    except httpx.TimeoutException as exc:
        raise GbfsTimeoutError(f"GBFS discovery 超时: {url}") from exc
    except httpx.RequestError as exc:
        raise GbfsError(f"GBFS discovery 请求失败: {url} — {exc}") from exc

    if resp.status_code >= 400:
        raise GbfsHttpError(
            f"GBFS discovery HTTP {resp.status_code}: {url}",
            resp.status_code,
        )

    try:
        data = resp.json()
    except Exception as exc:
        raise GbfsParseError(f"GBFS discovery JSON 解析失败: {url}") from exc

    return data


def get_feed_url(discovery: dict[str, Any], feed_name: str, lang: str = "en") -> str:
    """从 auto-discovery 中提取指定 feed 的 URL.

    兼容两种结构：
      - v2.3+:  data.feeds = [{name, url}, ...]
      - v1.x:   data.{lang}.feeds = [{name, url}, ...]

    Raises:
        GbfsFeedNotFoundError: 找不到该 feed
    """
    data = discovery.get("data", {})

    # 先尝试 v2.3+ 扁平结构
    feeds = data.get("feeds")
    if feeds is None:
        # 再尝试 v1.x 语言嵌套结构
        lang_data = data.get(lang, {})
        if isinstance(lang_data, dict):
            feeds = lang_data.get("feeds")

    if not isinstance(feeds, list):
        raise GbfsFeedNotFoundError(
            f"GBFS discovery 中找不到 feeds 数组 (lang={lang})"
        )

    for feed in feeds:
        if isinstance(feed, dict) and feed.get("name") == feed_name:
            url = feed.get("url")
            if url:
                return str(url)

    raise GbfsFeedNotFoundError(
        f"GBFS discovery 中找不到 feed '{feed_name}' (lang={lang})"
    )


def fetch_station_information(url: str) -> list[StationInfo]:
    """拉取 station_information feed，返回站点静态信息列表.

    Raises:
        GbfsTimeoutError, GbfsHttpError, GbfsParseError
    """
    try:
        with httpx.Client(
            timeout=_DEFAULT_TIMEOUT, follow_redirects=True, trust_env=False
        ) as client:
            resp = client.get(url)
    except httpx.TimeoutException as exc:
        raise GbfsTimeoutError(f"station_information 超时: {url}") from exc
    except httpx.RequestError as exc:
        raise GbfsError(f"station_information 请求失败: {url} — {exc}") from exc

    if resp.status_code >= 400:
        raise GbfsHttpError(
            f"station_information HTTP {resp.status_code}: {url}",
            resp.status_code,
        )

    try:
        payload = resp.json()
    except Exception as exc:
        raise GbfsParseError(f"station_information JSON 解析失败: {url}") from exc

    stations = payload.get("data", {}).get("stations")
    if not isinstance(stations, list):
        raise GbfsParseError(
            f"station_information 结构异常：缺少 data.stations 数组"
        )

    results: list[StationInfo] = []
    for raw in stations:
        if not isinstance(raw, dict):
            continue
        sid = raw.get("station_id") or raw.get("id")
        if not sid:
            continue
        results.append(
            StationInfo(
                station_id=str(sid),
                name=str(raw.get("name", "")),
                lat=float(raw.get("lat", 0.0)),
                lon=float(raw.get("lon", 0.0)),
                capacity=int(raw.get("capacity", 0) or 0),
                region_id=str(raw.get("region_id")) if raw.get("region_id") is not None else None,
                short_name=str(raw.get("short_name")) if raw.get("short_name") else None,
            )
        )

    logger.info("station_information 解析完成：%d 个站点", len(results))
    return results


def fetch_station_status(url: str) -> list[StationStatus]:
    """拉取 station_status feed，返回站点实时状态列表.

    Raises:
        GbfsTimeoutError, GbfsHttpError, GbfsParseError
    """
    try:
        with httpx.Client(
            timeout=_DEFAULT_TIMEOUT, follow_redirects=True, trust_env=False
        ) as client:
            resp = client.get(url)
    except httpx.TimeoutException as exc:
        raise GbfsTimeoutError(f"station_status 超时: {url}") from exc
    except httpx.RequestError as exc:
        raise GbfsError(f"station_status 请求失败: {url} — {exc}") from exc

    if resp.status_code >= 400:
        raise GbfsHttpError(
            f"station_status HTTP {resp.status_code}: {url}",
            resp.status_code,
        )

    try:
        payload = resp.json()
    except Exception as exc:
        raise GbfsParseError(f"station_status JSON 解析失败: {url}") from exc

    stations = payload.get("data", {}).get("stations")
    if not isinstance(stations, list):
        raise GbfsParseError(f"station_status 结构异常：缺少 data.stations 数组")

    results: list[StationStatus] = []
    for raw in stations:
        if not isinstance(raw, dict):
            continue
        sid = raw.get("station_id") or raw.get("id")
        if not sid:
            continue

        results.append(
            StationStatus(
                station_id=str(sid),
                num_bikes_available=int(raw.get("num_bikes_available", 0) or 0),
                num_docks_available=int(raw.get("num_docks_available", 0) or 0),
                is_renting=_parse_bool(raw.get("is_renting")),
                is_returning=_parse_bool(raw.get("is_returning")),
                is_installed=_parse_bool(raw.get("is_installed")),
                last_reported=_parse_last_reported(raw.get("last_reported")),
            )
        )

    logger.info("station_status 解析完成：%d 个站点", len(results))
    return results


def fetch_system_regions(url: str) -> list[SystemRegion]:
    """拉取 system_regions feed，返回区域列表.

    Raises:
        GbfsTimeoutError, GbfsHttpError, GbfsParseError
    """
    try:
        with httpx.Client(
            timeout=_DEFAULT_TIMEOUT, follow_redirects=True, trust_env=False
        ) as client:
            resp = client.get(url)
    except httpx.TimeoutException as exc:
        raise GbfsTimeoutError(f"system_regions 超时: {url}") from exc
    except httpx.RequestError as exc:
        raise GbfsError(f"system_regions 请求失败: {url} — {exc}") from exc

    if resp.status_code >= 400:
        raise GbfsHttpError(
            f"system_regions HTTP {resp.status_code}: {url}",
            resp.status_code,
        )

    try:
        payload = resp.json()
    except Exception as exc:
        raise GbfsParseError(f"system_regions JSON 解析失败: {url}") from exc

    regions = payload.get("data", {}).get("regions")
    if not isinstance(regions, list):
        raise GbfsParseError("system_regions 结构异常：缺少 data.regions 数组")

    results: list[SystemRegion] = []
    for raw in regions:
        if not isinstance(raw, dict):
            continue
        rid = raw.get("region_id")
        name = raw.get("name")
        if rid is not None and name is not None:
            results.append(SystemRegion(region_id=str(rid), name=str(name)))

    logger.info("system_regions 解析完成：%d 个区域", len(results))
    return results
