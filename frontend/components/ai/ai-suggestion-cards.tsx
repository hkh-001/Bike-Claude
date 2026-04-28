"use client";

import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, MapPin, BarChart3 } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: Activity,
    label: "当前系统运行状态怎么样？",
    color: "text-cyan-400",
    bg: "bg-cyan-500/8 hover:bg-cyan-500/12",
    border: "border-cyan-500/15 hover:border-cyan-500/25",
  },
  {
    icon: AlertTriangle,
    label: "当前有多少告警？哪些最紧急？",
    color: "text-amber-400",
    bg: "bg-amber-500/8 hover:bg-amber-500/12",
    border: "border-amber-500/15 hover:border-amber-500/25",
  },
  {
    icon: MapPin,
    label: "哪些站点需要优先调度？",
    color: "text-rose-400",
    bg: "bg-rose-500/8 hover:bg-rose-500/12",
    border: "border-rose-500/15 hover:border-rose-500/25",
  },
  {
    icon: BarChart3,
    label: "哪些区域供需最紧张？",
    color: "text-violet-400",
    bg: "bg-violet-500/8 hover:bg-violet-500/12",
    border: "border-violet-500/15 hover:border-violet-500/25",
  },
];

interface AiSuggestionCardsProps {
  onSelect: (text: string) => void;
}

export function AiSuggestionCards({ onSelect }: AiSuggestionCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      {SUGGESTIONS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(item.label)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-lg border px-3 py-2.5 text-left text-xs transition-all",
              "text-slate-300",
              item.bg,
              item.border,
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", item.color)} />
            <span className="leading-snug">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
