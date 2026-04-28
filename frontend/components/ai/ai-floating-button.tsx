"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiChatDrawer } from "./ai-chat-drawer";

export function AiFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-[#0a0d18]/90 backdrop-blur-md",
          "ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:ring-cyan-500/60 hover:shadow-cyan-500/20",
          "active:scale-95",
        )}
        aria-label="打开 AI 运营助手"
      >
        {/* 呼吸 glow 背景 */}
        <span className="absolute inset-0 rounded-full bg-cyan-500/10 animate-pulse" />

        {/* 呼吸点 */}
        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-cyan-400">
          <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-40" />
        </span>

        <Bot className="relative h-6 w-6 text-cyan-400" />
      </button>

      <AiChatDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
