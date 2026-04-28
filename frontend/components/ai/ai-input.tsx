"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface AiInputProps {
  onSend: (text: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function AiInput({
  onSend,
  isLoading,
  placeholder = "输入问题，按 Enter 发送...",
  disabled,
}: AiInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setText("");
    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // 自适应高度
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex items-end gap-2 border-t border-white/8 bg-[#0a0d18]/80 backdrop-blur-md px-3 py-2.5">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "AI 服务暂不可用" : placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className={cn(
          "min-h-[36px] resize-none rounded-lg border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/40 focus-visible:ring-1 focus-visible:ring-cyan-500/20",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!text.trim() || isLoading || disabled}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all",
          "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
          "hover:bg-cyan-500/25 hover:ring-cyan-500/50",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-cyan-500/15 disabled:hover:ring-cyan-500/30",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
