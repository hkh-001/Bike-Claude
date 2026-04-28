"use client";

import { useState } from "react";
import { AlertTriangle, BellRing, ShieldAlert, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  /** 演示模式告警（可选） */
  mockAlerts?: RecentAlertItem[];
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
  mockAlerts,
}: RecentAlertsPanelProps) {
  const [showMock, setShowMock] = useState(false);

  const displayAlerts = showMock && mockAlerts ? mockAlerts : alerts;
  const list = displayAlerts.slice(0, limit);
  const counts = displayAlerts.reduce(
    (acc, a) => {
      acc[a.level] = (acc[a.level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <DashboardPanel
      eyebrow={showMock ? "Live Alerts · 演示" : "Live Alerts"}
      title={showMock ? "最近告警流（演示数据）" : "最近告警流"}
      icon={<BellRing className="h-4 w-4" strokeWidth={2.25} />}
      accent={showMock ? "amber" : "rose"}
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
      footer={
        showMock
          ? "演示告警 · Mock 数据"
          : `显示最近 ${list.length} / 共 ${alerts.length} 条`
      }
    >
      {list.length === 0 && !showMock ? (
        <div className="flex flex-col gap-3">
          <EmptyState
            title="暂无未处理告警"
            description="系统当前无活跃告警，运营状态稳定。"
            className="border-none bg-transparent"
          />
          {mockAlerts && mockAlerts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMock(true)}
              className="mx-auto gap-1.5 border-[var(--neon-amber)]/30 text-[var(--neon-amber)] hover:bg-[var(--neon-amber)]/10"
            >
              <Eye className="h-3.5 w-3.5" />
              查看演示告警
            </Button>
          )}
        </div>
      ) : showMock ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-[var(--neon-amber)]/20 bg-[var(--neon-amber)]/[0.04] px-3 py-2 text-[11px] text-[var(--neon-amber)]">
            当前展示的是 Mock 演示告警，仅用于课堂展示，不代表真实数据。
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMock(false)}
            className="self-start gap-1.5 text-xs"
          >
            返回真实告警
          </Button>
          <AlertList alerts={list} />
        </div>
      ) : (
        <AlertList alerts={list} />
      )}
    </DashboardPanel>
  );
}

function AlertList({ alerts }: { alerts: RecentAlertItem[] }) {
  return (
    <ul className="flex flex-col">
      {alerts.map((alert, idx) => {
        const accent = alertLevelAccent(alert.level);
        const Icon = levelIcon[alert.level] ?? BellRing;
        const isLast = idx === alerts.length - 1;
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
  );
}
