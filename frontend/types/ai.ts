/**
 * AI 助手前端类型定义
 *
 * 对应后端 /api/ai/chat/stream 的 SSE 事件协议。
 */

export type AiRole = "user" | "assistant" | "system" | "error" | "tool";

export interface AiMessage {
  id: string;
  role: AiRole;
  content: string;
  createdAt: number;
  toolCalls?: AiToolCall[];
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: string;
  status: "running" | "completed" | "error";
  result?: string;
}

export type AiStreamEvent =
  | { type: "delta"; content: string }
  | { type: "tool_start"; id: string; name: string; arguments: string }
  | { type: "tool_result"; toolCallId: string; content: string }
  | { type: "done"; finishReason: string }
  | { type: "error"; message: string };

export interface ChatMessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiHealthResponse {
  ok: boolean;
  key_loaded: boolean;
  model: string;
  message: string;
}
