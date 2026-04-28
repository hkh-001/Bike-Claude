"""AI 助手路由：/api/ai/*."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.core.secrets import ApiKeyError, has_kimi_api_key
from app.db.session import get_session
from app.schemas.ai import AiHealthResponse, ChatRequest, ChatResponse
from app.services import ai_context_service, ai_tools, kimi_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["ai"])

_SYSTEM_PROMPT = """你是共享单车时空出行监控平台的智能运营分析助手。

[核心约束]
- 你只能基于系统提供的数据回答问题。
- 绝对不允许编造任何数字、比例、站点名称或结论。
- 当数据不足以回答时，必须明确说明"当前数据不足以回答该问题"。
- 数据时间戳已在上下文中标注，引用数据时请说明数据更新时间。

[站点查询约束]
- 当用户询问某个具体站点状态时，必须调用 get_station_detail 工具查询真实数据。
- 如果用户只提供站点名称的一部分，应尝试按名称模糊匹配。
- 如果模糊匹配到多个站点，不要猜测，应列出候选站点并请用户指定。
- 如果站点不存在，明确说明未找到，不允许编造站点状态。
- 回答必须包含：可用车数、可用桩数、容量、占用率、风险状态、运营建议。

[运营建议原则]
回答数据类问题时，尽量给出可执行的运营建议：
- 空车风险 → 建议调度车辆补充
- 满桩风险 → 建议清理桩位或暂停还车
- 离线 → 建议检查通讯链路和设备状态
- 异常 → 建议检查租车/还车功能
- critical 告警 → 建议立即派人处理
- 区域高占用 → 建议增派人手或调整定价

[容量排行]
- 当用户询问"哪个站点容量最大"或类似问题时，调用 get_station_capacity_ranking 工具。
- 如果用户未指定数量，默认返回 Top 10。

[输出格式 — 必须严格遵守]
你的回答必须像一份专业的数据运营报告，而不是原始 Markdown。

1. 章节标题：使用 `### 📊 标题` 格式（必须带 emoji）。
2. 数据摘要：先给出关键数字总览，用 1-2 句话概括，不要堆砌。
3. 风险/状态标记：
   - 空车/满桩/critical 用 `**🔴 空车风险**`
   - 高占用/告警用 `**🟡 高占用**`
   - 正常/低风险用 `**🟢 正常**`
   - 离线用 `**⚫ 离线**`
4. 站点列表：每条用 `- **站点名**（code）：可用车 X / 容量 Y（占用率 Z%）` 格式。
5. 运营建议：统一用引用块格式 `> 💡 建议：...`，每条建议独占一行。
6. 不同板块之间用 `---` 分隔线隔开。
7. 表格（如适用）：使用标准 Markdown 表格 `| 列1 | 列2 |` 格式。
8. 绝对禁止在正文中使用 HTML 标签。
9. 禁止在列表项内部嵌套大段文字，保持每条简短（一行或两行）。

[推理效率约束 — 必须严格遵守]
- 你的内部推理（reasoning）必须简短，不要在 reasoning_content 中写完整的内部草稿或重复系统提示词。
- 收到用户问题后，优先立即调用工具获取实时数据，然后直接生成最终回答。
- 不要在 reasoning_content 中逐条列举所有可能的分析角度，聚焦核心结论即可。
- 最终回答的总长度控制在 800 字以内。"""


def _build_messages(request: ChatRequest, session: Session) -> list[dict[str, Any]]:
    """构造完整的对话消息列表，注入系统上下文。"""
    context = ai_context_service.build_context(session)
    # 紧凑 JSON 减少输入 token（indent 会大幅增加 reasoning 负担）
    context_json = json.dumps(context, ensure_ascii=False, separators=(",", ":"))

    system_content = (
        f"{_SYSTEM_PROMPT}\n\n"
        f"[当前系统实时数据上下文]\n"
        f"数据时间：{context['timestamp']}\n"
        f"```json\n{context_json}\n```"
    )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_content}
    ]
    for m in request.messages:
        messages.append({"role": m.role, "content": m.content})
    return messages


def _execute_tools(
    tool_calls: list[dict[str, Any]], session: Session
) -> list[dict[str, Any]]:
    """执行 AI 请求的工具调用，返回 tool 结果消息。"""
    tool_messages: list[dict[str, Any]] = []
    for tc in tool_calls:
        func = tc.get("function", {})
        name = func.get("name", "")
        arguments_str = func.get("arguments", "{}")
        tool_id = tc.get("id", "")

        try:
            arguments = json.loads(arguments_str) if arguments_str else {}
        except json.JSONDecodeError:
            arguments = {}

        logger.info("AI tool call: %s(%s)", name, arguments)

        if name in ai_tools.TOOL_REGISTRY:
            tool_func = ai_tools.TOOL_REGISTRY[name]
            try:
                result = tool_func(session, **arguments)
            except Exception as exc:
                result = {"error": f"工具执行失败: {exc}"}
        else:
            result = {"error": f"未知工具: {name}"}

        tool_messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_id,
                "content": json.dumps(result, ensure_ascii=False),
            }
        )
    return tool_messages


@router.get("/health", response_model=AiHealthResponse)
def health() -> AiHealthResponse:
    key_ready = has_kimi_api_key()
    if key_ready:
        return AiHealthResponse(
            ok=True,
            key_loaded=True,
            model=kimi_client._DEFAULT_MODEL,
            message="Kimi API key 已就绪",
        )
    return AiHealthResponse(
        ok=False,
        key_loaded=False,
        model=kimi_client._DEFAULT_MODEL,
        message="apikey.txt 未找到或为空，请在项目根目录放置 Kimi API key",
    )


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_session)) -> ChatResponse:
    messages = _build_messages(request, db)

    try:
        result = kimi_client.complete(
            messages, tools=ai_tools.TOOL_SCHEMAS, model=request.model
        )
    except ApiKeyError as exc:
        logger.warning("AI chat rejected: %s", exc)
        raise HTTPException(
            status_code=503, detail="AI 服务暂不可用：apikey.txt 未就绪"
        ) from exc
    except Exception as exc:
        logger.warning("AI chat failed: %s - %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=502, detail="AI 服务暂不可用：调用 Kimi 接口失败"
        ) from exc

    # Tool-calling loop（上限 4 轮，防止无限互调）
    max_rounds = 4
    for _round in range(max_rounds):
        if (
            result.get("finish_reason") != "tool_calls"
            or "tool_calls" not in result
        ):
            break

        # 把 assistant 的 tool_calls 决策加入对话历史
        assistant_msg: dict[str, Any] = {
            "role": "assistant",
            "content": result.get("content", ""),
            "tool_calls": result["tool_calls"],
        }
        # kimi-k2.6 等推理模型必须回传 reasoning_content
        if "reasoning_content" in result:
            assistant_msg["reasoning_content"] = result["reasoning_content"]
        messages.append(assistant_msg)

        # 执行工具并追加结果
        tool_messages = _execute_tools(result["tool_calls"], db)
        messages.extend(tool_messages)

        # 重新调用 Kimi（带工具结果）
        try:
            result = kimi_client.complete(
                messages, tools=ai_tools.TOOL_SCHEMAS, model=request.model
            )
        except Exception as exc:
            logger.warning(
                "AI chat round %d failed: %s", _round + 1, type(exc).__name__
            )
            raise HTTPException(
                status_code=502, detail="AI 服务暂不可用：调用 Kimi 接口失败"
            ) from exc

    return ChatResponse(
        role=result.get("role", "assistant"),
        content=result.get("content", ""),
        finish_reason=result.get("finish_reason", "stop"),
    )


# ---------------------------------------------------------------------------
# SSE 流式接口
# ---------------------------------------------------------------------------


def _aggregate_tool_call(
    acc: dict[int, dict[str, Any]], tc: dict[str, Any]
) -> None:
    """把流式 chunk 中的单个 tool_call delta 聚合到 accumulator。"""
    idx = tc.get("index", 0)
    if idx not in acc:
        acc[idx] = {
            "id": "",
            "type": "function",
            "function": {"name": "", "arguments": ""},
        }
    entry = acc[idx]
    if tc.get("id"):
        entry["id"] = tc["id"]
    if tc.get("type"):
        entry["type"] = tc["type"]
    func = tc.get("function", {})
    if func.get("name"):
        entry["function"]["name"] = func["name"]
    if func.get("arguments"):
        entry["function"]["arguments"] += func["arguments"]


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest, db: Session = Depends(get_session)
) -> StreamingResponse:
    messages = _build_messages(request, db)

    async def event_stream():
        try:
            max_rounds = 4
            for _round in range(max_rounds):
                tool_calls_acc: dict[int, dict[str, Any]] = {}
                content_buffer = ""
                reasoning_buffer = ""
                finish_reason: str | None = None

                async for chunk in kimi_client.stream_complete_async(
                    messages, tools=ai_tools.TOOL_SCHEMAS, model=request.model
                ):
                    delta = chunk.get("delta", {})
                    finish_reason = chunk.get("finish_reason") or finish_reason

                    if delta.get("reasoning_content"):
                        reasoning_buffer += delta["reasoning_content"]

                    if delta.get("content") is not None:
                        content_buffer += delta["content"]

                    # 只要有 content 或 reasoning_content 就 yield delta，
                    # 确保前端在 reasoning 阶段也能收到事件并结束 loading
                    if delta.get("content") is not None or delta.get("reasoning_content"):
                        payload: dict[str, Any] = {}
                        if delta.get("content") is not None:
                            payload["content"] = delta["content"]
                        if delta.get("reasoning_content"):
                            payload["reasoning_content"] = delta["reasoning_content"]
                        yield (
                            f"event: delta\n"
                            f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                        )

                    if delta.get("tool_calls"):
                        for tc in delta["tool_calls"]:
                            _aggregate_tool_call(tool_calls_acc, tc)

                # 本轮结束，检查是否触发了 tool_calls
                if finish_reason == "tool_calls" and tool_calls_acc:
                    aggregated = [
                        tool_calls_acc[i] for i in sorted(tool_calls_acc)
                    ]

                    for tc in aggregated:
                        yield (
                            f"event: tool_start\n"
                            f"data: {json.dumps({'id': tc['id'], 'name': tc['function']['name'], 'arguments': tc['function']['arguments']}, ensure_ascii=False)}\n\n"
                        )

                    tool_messages = _execute_tools(aggregated, db)
                    for tm in tool_messages:
                        yield (
                            f"event: tool_result\n"
                            f"data: {json.dumps({'tool_call_id': tm['tool_call_id'], 'content': tm['content'][:500]}, ensure_ascii=False)}\n\n"
                        )

                    assistant_msg: dict[str, Any] = {
                        "role": "assistant",
                        "content": content_buffer,
                        "tool_calls": aggregated,
                    }
                    if reasoning_buffer:
                        assistant_msg["reasoning_content"] = reasoning_buffer
                    messages.append(assistant_msg)
                    messages.extend(tool_messages)
                    continue  # 进入下一轮对话

                # 正常结束（无 tool_calls）
                yield (
                    f"event: done\n"
                    f"data: {json.dumps({'finish_reason': finish_reason or 'stop'}, ensure_ascii=False)}\n\n"
                )
                return

            # 达到最大轮数上限
            yield (
                f"event: done\n"
                f"data: {json.dumps({'finish_reason': 'stop', 'note': '达到最大对话轮数上限'}, ensure_ascii=False)}\n\n"
            )

        except ApiKeyError:
            yield (
                f"event: error\n"
                f"data: {json.dumps({'message': 'AI 服务暂不可用：apikey.txt 未就绪'}, ensure_ascii=False)}\n\n"
            )
        except Exception as exc:
            logger.warning("AI stream failed: %s - %s", type(exc).__name__, str(exc)[:200])
            yield (
                f"event: error\n"
                f"data: {json.dumps({'message': 'AI 服务暂不可用：调用 Kimi 接口失败'}, ensure_ascii=False)}\n\n"
            )

        # 兜底：无论正常结束还是异常，最后都 yield done，防止前端永远 loading
        yield (
            f"event: done\n"
            f"data: {json.dumps({'finish_reason': 'stop'}, ensure_ascii=False)}\n\n"
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
