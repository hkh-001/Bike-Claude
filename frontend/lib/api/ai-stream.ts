/**
 * AI Chat SSE 流式客户端
 *
 * 使用 fetch + ReadableStream 消费后端 /api/ai/chat/stream 的 text/event-stream。
 * 注意：EventSource 不支持 POST + body，因此必须使用 fetch。
 */

import type { AiStreamEvent, ChatMessagePayload } from "@/types/ai";

export interface AiStreamCallbacks {
  onEvent?: (event: AiStreamEvent) => void;
  onError?: (err: Error) => void;
  onDone?: () => void;
}

/**
 * 解析 SSE 单行文本，返回事件名 + 数据。
 *
 * 格式示例：
 *   event: delta\n
 *   data: {"content": "hello"}\n
 *   \n
 */
function parseSseLine(line: string): { event: string; data: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(":")) return null;

  const eventMatch = trimmed.match(/^event:\s*(.*)$/);
  const dataMatch = trimmed.match(/^data:\s*(.*)$/);

  if (eventMatch) return { event: eventMatch[1].trim(), data: "" };
  if (dataMatch) return { event: "", data: dataMatch[1].trim() };

  return null;
}

/**
 * 启动 SSE 流式对话。
 *
 * @param messages 对话历史（不含 system，由后端注入上下文）
 * @param callbacks 事件回调
 * @returns AbortController，供调用方取消请求
 */
export function streamAiChat(
  messages: ChatMessagePayload[],
  callbacks: AiStreamCallbacks = {},
): AbortController {
  const controller = new AbortController();

  const run = async () => {
    try {
      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let detail = `AI 服务暂不可用 (${res.status})`;
        try {
          const parsed = JSON.parse(text) as { detail?: string };
          if (parsed.detail) detail = parsed.detail;
        } catch {
          /* noop */
        }
        callbacks.onError?.(new Error(detail));
        return;
      }

      if (!res.body) {
        callbacks.onError?.(new Error("响应体为空"));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // 当前正在读取的 SSE 事件
      let currentEvent = "";
      let currentData = "";

      const flushEvent = () => {
        if (!currentEvent && !currentData) return;
        const event = currentEvent || "message";
        const data = currentData;
        currentEvent = "";
        currentData = "";

        if (event === "delta") {
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) {
              callbacks.onEvent?.({ type: "delta", content: parsed.content });
            }
          } catch {
            callbacks.onEvent?.({ type: "delta", content: data });
          }
          return;
        }

        if (event === "tool_start") {
          try {
            const parsed = JSON.parse(data) as {
              id: string;
              name: string;
              arguments: string;
            };
            callbacks.onEvent?.({
              type: "tool_start",
              id: parsed.id,
              name: parsed.name,
              arguments: parsed.arguments,
            });
          } catch {
            /* noop */
          }
          return;
        }

        if (event === "tool_result") {
          try {
            const parsed = JSON.parse(data) as {
              tool_call_id: string;
              content: string;
            };
            callbacks.onEvent?.({
              type: "tool_result",
              toolCallId: parsed.tool_call_id,
              content: parsed.content,
            });
          } catch {
            /* noop */
          }
          return;
        }

        if (event === "done") {
          try {
            const parsed = JSON.parse(data) as { finish_reason?: string };
            callbacks.onEvent?.({
              type: "done",
              finishReason: parsed.finish_reason || "stop",
            });
          } catch {
            callbacks.onEvent?.({ type: "done", finishReason: "stop" });
          }
          callbacks.onDone?.();
          return;
        }

        if (event === "error") {
          try {
            const parsed = JSON.parse(data) as { message?: string };
            callbacks.onError?.(
              new Error(parsed.message || "AI 服务返回错误"),
            );
          } catch {
            callbacks.onError?.(new Error(data || "AI 服务返回错误"));
          }
          return;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // 保留最后一行（可能不完整）
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") {
            // 空行表示一个 SSE 事件结束
            flushEvent();
            continue;
          }

          const parsed = parseSseLine(line);
          if (!parsed) continue;

          if (parsed.event) {
            currentEvent = parsed.event;
          }
          if (parsed.data) {
            currentData = parsed.data;
          }
        }
      }

      // 处理缓冲区剩余内容
      if (buffer.trim()) {
        const parsed = parseSseLine(buffer);
        if (parsed) {
          if (parsed.event) currentEvent = parsed.event;
          if (parsed.data) currentData = parsed.data;
        }
      }
      flushEvent();

      callbacks.onDone?.();
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // 用户主动取消，不算错误
        return;
      }
      callbacks.onError?.(
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  };

  run();
  return controller;
}

/**
 * 非流式单轮对话（SSE 关闭时回退）。
 *
 * 直接调用 /api/ai/chat，返回完整 assistant 文本。
 */
export async function chatOnce(
  messages: ChatMessagePayload[],
): Promise<{ content: string; finishReason: string }> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = `AI 服务暂不可用 (${res.status})`;
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      if (parsed.detail) detail = parsed.detail;
    } catch {
      /* noop */
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as {
    role: string;
    content: string;
    finish_reason: string;
  };
  return { content: data.content, finishReason: data.finish_reason };
}
