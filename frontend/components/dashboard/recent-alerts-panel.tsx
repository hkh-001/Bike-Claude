"use client";

import { AlertTriangle, BellRing, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/common/empty-state";
import type { RecentAlertItem } from "@/lib/api/client";
import { alertLevelAccent, alertLevelLabel } from "@/lib/format";
import { formatRelative, formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type RecentAlertsPanelProps = {
  alerts: RecentAlertItem[];
  /** 显示条数上限 */
  limit?: number;
};

const levelIcon: Record<"info" | "warning" | "critical", LucideIcon> = {
  info: BellRing,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

const accentText = {
  cyan: "text-[var(--neon-cyan)]",
  amber: "text-[var(--neon-amber)]",
  rose: "text-[var(--neon-rose)]",
} as const;

const accentBorder = {
  cyan: "border-[var(--neon-cyan)]/40",
  amber: "border-[var(--neon-amber)]/40",
  rose: "border-[var(--neon-rose)]/40",
} as const;

const accentDot = {
  cyan: "bg-[var(--neon-cyan)]",
  amber: "bg-[var(--neon-amber)]",
  rose: "bg-[var(--neon-rose)]",
} as const;

export function RecentAlertsPanel({
  alerts,
  limit = 8,
}: RecentAlertsPanelProps) {
  const list = alerts.slice(0, limit);
  const counts = alerts.reduce(
    (acc, a) => {
      acc[a.level] = (acc[a.level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <DashboardPanel
      eyebrow="Live Alerts"
      title="最近告警流"
      icon={<BellRing className="h-4 w-4" strokeWidth={2.25} />}
      accent="rose"
      meta={
        <div className="flex items-center gap-1.5 text-[10px] tabular-nums">
          <Badge variant="outline" className={cn(accentBorder.rose, accentText.rose)}>
            紧急 {counts.critical ?? 0}
          </Badge>
          <Badge variant="outline" className={cn(accentBorder.amber, accentText.amber)}>
            警告 {counts.warning ?? 0}
          </Badge>
          <Badge variant="outline" className={cn(accentBorder.cyan, accentText.cyan)}>
            提示 {counts.info ?? 0}
          </Badge>
        </div>
      }
      footer={`显示最近 ${list.length} / 共 ${alerts.length} 条`}
    >
      {list.length === 0 ? (
        <EmptyState
          title="暂无未处理告警"
          description="系统当前无活跃告警，运营状态稳定。"
          className="border-none bg-transparent"
        />
      ) : (
        <ul className="flex flex-col">
          {list.map((alert, idx) => {
            const accent = alertLevelAccent(alert.level);
            const Icon = levelIcon[alert.level] ?? BellRing;
            const isLast = idx === list.length - 1;
            return (
              <li
                key={alert.id}
                className={cn(
                  "group flex gap-3 py-3 transition-colors",
                  !isLast && "border-b border-border/40",
                )}
              >
                <div className="flex flex-col items-center pt-0.5">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", accentDot[accent])} />
                  {!isLast && (
                    <span className="mt-1 w-px flex-1 bg-border/40 group-last:hidden" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em]",
                        accentText[accent],
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {alertLevelLabel(alert.level)}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {alert.title}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80">
                    {alert.station_code && (
                      <span className="font-mono">站点 {alert.station_code}</span>
                    )}
                    {alert.region_code && (
                      <span className="font-mono">区域 {alert.region_code}</span>
                    )}
                    <span
                      className="ml-auto tabular-nums"
                      title={formatDateTime(alert.created_at)}
                    >
                      {formatRelative(alert.created_at)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
