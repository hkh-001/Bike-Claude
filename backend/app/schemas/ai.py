"""AI 助手接口 Schema."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ChatRole = Literal["system", "user", "assistant"]


class ChatMessage(BaseModel):
    role: ChatRole = Field(..., description="消息角色")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, description="对话历史")
    model: str = Field(
        default="kimi-k2.6",
        description="Kimi 模型标识，默认 kimi-k2.6",
    )


class ChatResponse(BaseModel):
    role: ChatRole = Field(default="assistant")
    content: str = Field(default="", description="助手回复全文")
    finish_reason: str = Field(default="stop", description="stop / length / tool_calls")


class AiHealthResponse(BaseModel):
    ok: bool = Field(description="后端 AI 模块是否就绪")
    key_loaded: bool = Field(description="apikey.txt 是否已加载")
    model: str = Field(default="kimi-k2.6", description="默认使用的模型标识")
    message: str = Field(description="人类可读的状态说明")
