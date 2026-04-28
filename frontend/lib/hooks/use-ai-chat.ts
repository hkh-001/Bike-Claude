"use client";

import { useState, useCallback, useRef } from "react";
import type { AiMessage, AiToolCall, ChatMessagePayload } from "@/types/ai";
import { streamAiChat, chatOnce } from "@/lib/api/ai-stream";
import { useAppSettings } from "./use-app-settings";
import { useAiChatHistory, buildChatContext, clearHistory } from "./use-ai-chat-history";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAiChat() {
  const { settings } = useAppSettings();
  const streamingEnabled = settings.aiStreamingEnabled;

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // localStorage 持久化：加载 + 自动保存
  const { handleClear } = useAiChatHistory(messages, (loaded) => {
    setMessages(loaded);
  });

  const appendToLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, content: last.content + content }];
    });
  }, []);

  const addToolCall = useCallback((toolCall: AiToolCall) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { ...last, toolCalls: [...(last.toolCalls || []), toolCall] },
      ];
    });
  }, []);

  const updateToolCall = useCallback(
    (toolCallId: string, updater: (tc: AiToolCall) => AiToolCall) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (!last.toolCalls) return prev;
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            toolCalls: last.toolCalls.map((tc) =>
              tc.id === toolCallId ? updater(tc) : tc,
            ),
          },
        ];
      });
    },
    [],
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      setError(null);
      setIsLoading(true);
      setIsStreaming(false);

      const userMsgId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: text, createdAt: Date.now() },
      ]);

      const assistantMsgId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
        },
      ]);

      // 上下文策略：取最近 10 条 user/assistant 历史 + 当前用户消息
      const context = buildChatContext(messages, 10);
      const history: ChatMessagePayload[] = [
        ...context,
        { role: "user", content: text },
      ];

      if (!streamingEnabled) {
        // 非流式：直接调 /api/ai/chat
        try {
          const result = await chatOnce(history);
          setIsLoading(false);
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, content: result.content }];
          });
        } catch (err) {
          setIsLoading(false);
          setError(err instanceof Error ? err.message : String(err));
        }
        return;
      }

      // 流式：SSE
      abortRef.current = streamAiChat(history, {
        onEvent: (event) => {
          switch (event.type) {
            case "delta":
              setIsLoading(false);
              setIsStreaming(true);
              appendToLastMessage(event.content);
              break;

            case "tool_start": {
              setIsLoading(false);
              const tc: AiToolCall = {
                id: event.id,
                name: event.name,
                arguments: event.arguments,
                status: "running",
              };
              addToolCall(tc);
              break;
            }

            case "tool_result": {
              updateToolCall(event.toolCallId, (tc) => ({
                ...tc,
                status: "completed",
                result: event.content,
              }));
              break;
            }

            case "done":
              setIsLoading(false);
              setIsStreaming(false);
              break;

            case "error":
              setIsLoading(false);
              setIsStreaming(false);
              setError(event.message);
              break;
          }
        },
        onError: (err) => {
          setIsLoading(false);
          setIsStreaming(false);
          setError(err.message);
        },
        onDone: () => {
          setIsLoading(false);
          setIsStreaming(false);
        },
      });
    },
    [messages, streamingEnabled, appendToLastMessage, addToolCall, updateToolCall],
  );

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend],
  );

  const handleClearHistory = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    clearHistory();
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  const showSuggestions = messages.length === 0 && !isLoading && !error;

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    handleSend,
    handleSuggestionSelect,
    handleClearHistory,
    showSuggestions,
  };
}
