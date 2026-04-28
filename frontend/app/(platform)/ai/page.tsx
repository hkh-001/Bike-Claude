"use client";

import { Bot, Zap, Database, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiChat } from "@/lib/hooks/use-ai-chat";
import { AiMessageList } from "@/components/ai/ai-message-list";
import { AiInput } from "@/components/ai/ai-input";

export default function AiPage() {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    handleSend,
    handleSuggestionSelect,
    showSuggestions,
  } = useAiChat();

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-120px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/25">
            <Bot className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              AI 运营助手
            </h1>
            <p className="text-xs text-muted-foreground">
              Kimi / Moonshot · 数据驱动 · Tool Enabled · Streaming
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400 ring-1 ring-cyan-500/20">
            <Database className="h-2.5 w-2.5" /> 数据驱动
          </span>
          <span className="flex items-center gap-1 rounded-full bg-lime-500/10 px-2 py-0.5 text-[10px] text-lime-400 ring-1 ring-lime-500/20">
            <Zap className="h-2.5 w-2.5" /> Tool
          </span>
          <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400 ring-1 ring-violet-500/20">
            <Radio className="h-2.5 w-2.5" /> SSE
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div
        className={cn(
          "flex-1 flex flex-col rounded-xl border border-border/40 bg-[#0a0d18]/60 overflow-hidden",
          "backdrop-blur-sm",
        )}
      >
        <AiMessageList
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          showSuggestions={showSuggestions}
          onSuggestionSelect={handleSuggestionSelect}
          error={error}
        />
        <AiInput
          onSend={handleSend}
          isLoading={isLoading}
          disabled={!!error && error.includes("暂不可用")}
        />
      </div>
    </div>
  );
}
