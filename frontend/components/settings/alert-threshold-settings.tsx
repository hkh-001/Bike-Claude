"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_OPTIONS = [
  { value: 0, label: "0 辆" },
  { value: 1, label: "1 辆", default: true },
  { value: 2, label: "2 辆" },
];

const FULL_OPTIONS = [
  { value: 0.9, label: "90%" },
  { value: 0.95, label: "95%", default: true },
  { value: 0.98, label: "98%" },
];

interface AlertThresholdSettingsProps {
  emptyThreshold: number;
  fullThreshold: number;
  onEmptyChange: (value: number) => void;
  onFullChange: (value: number) => void;
}

export function AlertThresholdSettings({
  emptyThreshold,
  fullThreshold,
  onEmptyChange,
  onFullChange,
}: AlertThresholdSettingsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">告警阈值</h3>
        <p className="text-xs text-muted-foreground">配置风险站点的判定条件</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--neon-amber)]">
            <AlertTriangle className="h-3 w-3" />
            空车风险阈值（可用车 ≤）
          </div>
          <div className="flex flex-wrap gap-2">
            {EMPTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onEmptyChange(opt.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                  emptyThreshold === opt.value
                    ? "border-[var(--neon-amber)]/50 bg-[var(--neon-amber)]/10 text-[var(--neon-amber)]"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--neon-rose)]">
            <AlertTriangle className="h-3 w-3" />
            满桩风险阈值（占用率 ≥）
          </div>
          <div className="flex flex-wrap gap-2">
            {FULL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFullChange(opt.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                  fullThreshold === opt.value
                    ? "border-[var(--neon-rose)]/50 bg-[var(--neon-rose)]/10 text-[var(--neon-rose)]"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-1.5 rounded-md border border-amber-500/10 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300/80">
        <Info className="h-3 w-3 shrink-0 mt-0.5" />
        当前阈值用于前端偏好展示；后端告警规则接入将在后续阶段完成。
      </div>
    </div>
  );
}
