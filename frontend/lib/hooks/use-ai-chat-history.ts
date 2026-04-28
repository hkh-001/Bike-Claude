"use client";

import { useCallback, useRef, useEffect } from "react";
import type { AiMessage } from "@/types/ai";

const STORAGE_KEY = "bike-ai-chat-history";
const MAX_MESSAGES = 50;
const SAVE_DEBOUNCE_MS = 500;

function isClient() {
  return typeof window !== "undefined";
}

/** 从 localStorage 加载历史消息 */
export function loadHistory(): AiMessage[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiMessage[];
    if (!Array.isArray(parsed)) return [];
    // 基础校验：必须有 id/role/content/createdAt
    return parsed.filter(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        typeof m.createdAt === "number",
    );
  } catch {
    return [];
  }
}

/** 直接写入 localStorage（内部使用） */
function writeHistory(messages: AiMessage[]) {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // localStorage 满或隐私模式，静默失败
  }
}

/** 清理历史：限制条数、清理过长的 tool result */
export function trimHistory(messages: AiMessage[]): AiMessage[] {
  // 只保留 user/assistant 消息用于发送上下文
  // 但本地存储保留所有角色（包括 tool/error），以便 UI 完整还原
  let trimmed = messages;

  // 限制总条数
  if (trimmed.length > MAX_MESSAGES) {
    trimmed = trimmed.slice(-MAX_MESSAGES);
  }

  // 清理 toolCalls 中过长的 result，防止 localStorage 爆掉
  trimmed = trimmed.map((m) => {
    if (!m.toolCalls?.length) return m;
    return {
      ...m,
      toolCalls: m.toolCalls.map((tc) => {
        if (tc.result && tc.result.length > 2000) {
          return { ...tc, result: tc.result.slice(0, 2000) + "…（已截断）" };
        }
        return tc;
      }),
    };
  });

  return trimmed;
}

/** 立即保存（供外部直接调用） */
export function saveHistory(messages: AiMessage[]) {
  writeHistory(trimHistory(messages));
}

/** 清空历史 */
export function clearHistory() {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}

/** 提取最近 N 条 user/assistant 消息，用于发送给后端作为上下文 */
export function buildChatContext(
  messages: AiMessage[],
  limit: number = 10,
): { role: "user" | "assistant"; content: string }[] {
  const context = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-limit)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  return context;
}

/** React hook：防抖自动保存 + 加载 */
export function useAiChatHistory(
  messages: AiMessage[],
  onLoad?: (loaded: AiMessage[]) => void,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 首次加载
  useEffect(() => {
    const loaded = loadHistory();
    if (loaded.length > 0) {
      onLoad?.(loaded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 消息变化时防抖保存
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveHistory(messages);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [messages]);

  const handleClear = useCallback(() => {
    clearHistory();
    onLoad?.([]);
  }, [onLoad]);

  return { handleClear };
}
