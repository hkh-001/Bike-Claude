"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { alertLevelLabel, alertLevelAccent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StationAlertItem } from "@/lib/api/client";

interface StationAlertsTimelineProps {
  alerts?: StationAlertItem[];
  isLoading: boolean;
}

export function StationAlertsTimeline({ alerts, isLoading }: StationAlertsTimelineProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2"
      >
        <AlertTriangle className="h-4 w-4 text-[var(--neon-amber)]" />
        <h3 className="text-sm font-semibold text-foreground"
        >站点告警</h3>
        {alerts !== undefined && (
          <span className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums"
          >
            {alerts.length} 条
          </span>
        )}
      </div
      >

      <div className="flex flex-col gap-2"
      >
        {isLoading && !alerts && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <AlertSkeleton key={i} />
            ))}
          </>
        )}
        {alerts?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground"
          >
            <Clock className="h-6 w-6 opacity-40" />
            <span className="text-sm"
            >暂无告警记录</span>
          </div>
        )}
        {alerts?.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: StationAlertItem }) {
  const accent = alertLevelAccent(alert.level);
  const label = alertLevelLabel(alert.level);

  const accentMap: Record<string, string> = {
    rose: "var(--neon-rose)",
    amber: "var(--neon-amber)",
    cyan: "var(--neon-cyan)",
  };
  const color = accentMap[accent] ?? "var(--neon-cyan)";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5"
    >
      <span
        className="mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 shrink-0"
        style={{
          color,
          backgroundColor: `${color}14`,
          borderColor: `${color}33`,
        }}
      >
        {label}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0"
      >
        <span className="text-sm font-medium text-foreground truncate"
        >
          {alert.title}
        </span>
        <span className="text-[11px] text-muted-foreground line-clamp-2"
        >
          {alert.message}
        </span
        >
        <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums"
        >
          {new Date(alert.created_at).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <span
        className={cn(
          "ml-auto shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
          alert.status === "open"
            ? "bg-[var(--neon-rose)]/10 text-[var(--neon-rose)] ring-[var(--neon-rose)]/20"
            : "bg-[var(--neon-lime)]/10 text-[var(--neon-lime)] ring-[var(--neon-lime)]/20"
        )}
      >
        {alert.status === "open" ? "未处理" : "已处理"}
      </span>
    </div>
  );
}

function AlertSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5"
    >
      <Skeleton className="h-5 w-10 shrink-0" />
      <div className="flex flex-col gap-1.5 min-w-0 flex-1"
      >
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-12 shrink-0" />
    </div>
  );
}
