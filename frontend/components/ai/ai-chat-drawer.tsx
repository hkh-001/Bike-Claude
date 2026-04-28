"use client";

import { Bot, Zap, Database, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAiChat } from "@/lib/hooks/use-ai-chat";
import { AiMessageList } from "./ai-message-list";
import { AiInput } from "./ai-input";

interface AiChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiChatDrawer({ open, onOpenChange }: AiChatDrawerProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col border-l border-cyan-500/20 bg-[#0a0d18]/95 p-0 backdrop-blur-xl",
          "sm:max-w-[480px] xl:max-w-[620px]",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
            <Bot className="h-4 w-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-100">AI 运营助手</h3>
            <p className="text-[11px] text-slate-500 truncate">Kimi / Moonshot · 数据驱动 · Tool Enabled · Streaming</p>
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

        {/* Messages */}
        <AiMessageList
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          showSuggestions={showSuggestions}
          onSuggestionSelect={handleSuggestionSelect}
          error={error}
        />

        {/* Input */}
        <AiInput
          onSend={handleSend}
          isLoading={isLoading}
          disabled={!!error && error.includes("暂不可用")}
        />
      </SheetContent>
    </Sheet>
  );
}
