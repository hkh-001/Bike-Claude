"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const DASHBOARD_OPTIONS = [
  { value: 15_000, label: "15 秒" },
  { value: 30_000, label: "30 秒", default: true },
  { value: 60_000, label: "60 秒" },
  { value: 120_000, label: "120 秒" },
];

const ALERT_OPTIONS = [
  { value: 15_000, label: "15 秒" },
  { value: 30_000, label: "30 秒", default: true },
  { value: 60_000, label: "60 秒" },
];

interface RefreshSettingsProps {
  dashboardInterval: number;
  alertInterval: number;
  onDashboardChange: (value: number) => void;
  onAlertChange: (value: number) => void;
}

export function RefreshSettings({
  dashboardInterval,
  alertInterval,
  onDashboardChange,
  onAlertChange,
}: RefreshSettingsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">自动刷新频率</h3>
        <p className="text-xs text-muted-foreground">控制 Dashboard 与告警数据的自动刷新间隔</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            Dashboard 刷新
          </div>
          <div className="flex flex-wrap gap-2">
            {DASHBOARD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDashboardChange(opt.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                  dashboardInterval === opt.value
                    ? "border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            告警刷新
          </div>
          <div className="flex flex-wrap gap-2">
            {ALERT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onAlertChange(opt.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                  alertInterval === opt.value
                    ? "border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
