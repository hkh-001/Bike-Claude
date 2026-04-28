"""Kimi / Moonshot OpenAI-compatible client — lazy singleton."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from app.core.secrets import ApiKeyError, read_kimi_api_key

if TYPE_CHECKING:
    from openai import OpenAI

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "kimi-k2.6"
_BASE_URL = "https://api.moonshot.cn/v1"

_client: "OpenAI | None" = None


def _get_client() -> "OpenAI":
    """延迟初始化 OpenAI client；首次调用时才读 apikey.txt."""
    global _client
    if _client is not None:
        return _client
    try:
        api_key = read_kimi_api_key()
    except ApiKeyError as exc:
        logger.warning("Kimi API key not ready: %s", exc)
        raise
    # 延迟 import，避免模块级导入即触发 openai 初始化
    from openai import OpenAI

    _client = OpenAI(api_key=api_key, base_url=_BASE_URL)
    return _client


def complete(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    model: str = _DEFAULT_MODEL,
) -> dict[str, Any]:
    """同步调用 Kimi Chat Completion（支持 tool-calling）.

    Args:
        messages: 完整消息列表，**包含 system**（由调用方构造上下文）。
        tools: OpenAI function schema 列表，用于 tool-calling。
        model: 模型标识，默认 ``kimi-k2.6``。

    Returns:
        dict with keys ``role``, ``content``, ``finish_reason``,
        以及可选的 ``tool_calls``。

    Raises:
        ApiKeyError: key 未就绪。
        Exception: Kimi 网络 / 超时 / 服务端错误。
    """
    client = _get_client()
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": 2048,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    try:
        completion = client.chat.completions.create(**kwargs)
    except Exception as exc:
        # 绝不记录 key；仅记录异常类型
        logger.warning("Kimi API call failed: %s", type(exc).__name__)
        raise

    choice = completion.choices[0]
    message = choice.message
    result: dict[str, Any] = {
        "role": message.role,
        "content": message.content or "",
        "finish_reason": choice.finish_reason or "stop",
    }
    # kimi-k2.6 等推理模型会返回 reasoning_content，tool-calling 多轮时必须回传
    reasoning = getattr(message, "reasoning_content", None)
    if reasoning:
        result["reasoning_content"] = reasoning
    if message.tool_calls:
        result["tool_calls"] = [
            {
                "id": tc.id,
                "type": tc.type,
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in message.tool_calls
        ]
    return result


def stream_complete(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    model: str = _DEFAULT_MODEL,
):
    """流式调用 Kimi Chat Completion（支持 tool-calling）.

    Yields dict chunks with keys ``delta`` (content + partial tool_calls)
    and ``finish_reason``。

    Tool calls 在流式响应中可能分片返回，调用方需要按 ``index`` 聚合。
    """
    client = _get_client()
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": 2048,
        "stream": True,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    try:
        completion = client.chat.completions.create(**kwargs)
    except Exception as exc:
        err_detail = ""
        if hasattr(exc, "body") and exc.body:
            err_detail = str(exc.body)
        elif hasattr(exc, "response") and exc.response:
            err_detail = exc.response.text[:500]
        else:
            err_detail = str(exc)[:500]
        logger.warning(
            "Kimi API stream call failed: %s - %s", type(exc).__name__, err_detail
        )
        raise

    for chunk in completion:
        if not chunk.choices:
            continue
        choice = chunk.choices[0]
        delta = choice.delta
        finish_reason = choice.finish_reason

        delta_payload: dict[str, Any] = {
            "content": delta.content,
            "tool_calls": [
                {
                    "index": tc.index,
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name if tc.function else None,
                        "arguments": (
                            tc.function.arguments if tc.function else None
                        ),
                    },
                }
                for tc in (delta.tool_calls or [])
            ]
            if delta.tool_calls
            else None,
        }
        # kimi-k2.6 等推理模型会返回 reasoning_content，tool-calling 多轮时必须回传
        reasoning_delta = getattr(delta, "reasoning_content", None)
        if reasoning_delta:
            delta_payload["reasoning_content"] = reasoning_delta

        yield {
            "delta": delta_payload,
            "finish_reason": finish_reason,
        }
