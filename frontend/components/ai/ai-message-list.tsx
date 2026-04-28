"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AiMessage } from "@/types/ai";
import { AiMessageBubble } from "./ai-message-bubble";
import { AiSuggestionCards } from "./ai-suggestion-cards";

interface AiMessageListProps {
  messages: AiMessage[];
  isLoading?: boolean;
  isStreaming?: boolean;
  showSuggestions?: boolean;
  onSuggestionSelect?: (text: string) => void;
  error?: string | null;
}

export function AiMessageList({
  messages,
  isLoading,
  isStreaming,
  showSuggestions,
  onSuggestionSelect,
  error,
}: AiMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
      {!hasMessages && showSuggestions && onSuggestionSelect && (
        <div className="space-y-3">
          <div className="text-center text-xs text-slate-500 py-2">
            选择一个推荐问题开始对话
          </div>
          <AiSuggestionCards onSelect={onSuggestionSelect} />
        </div>
      )}

      {!hasMessages && !showSuggestions && (
        <div className="flex h-full items-center justify-center text-slate-500 text-sm">
          开始与 AI 运营助手对话...
        </div>
      )}

      {messages.map((msg, idx) => (
        <AiMessageBubble
          key={msg.id}
          message={msg}
          isStreaming={
            isStreaming && idx === messages.length - 1 && msg.role === "assistant"
          }
        />
      ))}

      {isLoading && !isStreaming && (
        <div className="flex items-center gap-2 px-10 text-xs text-slate-400">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span>Kimi 正在分析实时运营数据...</span>
        </div>
      )}

      {error && (
        <div className="mx-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
