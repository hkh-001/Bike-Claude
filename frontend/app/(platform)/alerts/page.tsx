"use client";

import { useState } from "react";
import { AlertTriangle, Filter } from "lucide-react";
import { useAlerts } from "@/lib/hooks/use-alerts";
import { useAppSettings } from "@/lib/hooks/use-app-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { alertLevelLabel, alertLevelAccent, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RecentAlertItem } from "@/lib/api/client";

const LEVEL_FILTERS: { label: string; value: "info" | "warning" | "critical" | null }[] = [
  { label: "全部", value: null },
  { label: "紧急", value: "critical" },
  { label: "警告", value: "warning" },
  { label: "提示", value: "info" },
];

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "未处理", value: "open" },
  { label: "全部", value: "all" },
];

export default function AlertsPage() {
  const [level, setLevel] = useState<"info" | "warning" | "critical" | null>(null);
  const [status, setStatus] = useState<string>("open");
  const { settings } = useAppSettings();
  const { data, isLoading, error } = useAlerts(
    level,
    status,
    200,
    settings.alertRefreshInterval,
  );

  const stats = data?.reduce(
    (acc, a) => {
      acc[a.level] = (acc[a.level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/25">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">告警中心</h1>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.length} 条告警` : "加载中…"} · 实时推送
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[var(--neon-amber)]/30 text-[var(--neon-amber)] w-fit"
        >
          实时
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {LEVEL_FILTERS.map((f) => (
            <Button
              key={f.label}
              variant="outline"
              size="sm"
              onClick={() => setLevel(f.value)}
              className={cn(
                "h-7 text-xs border transition-all",
                level === f.value
                  ? "bg-[var(--neon-amber)]/10 border-[var(--neon-amber)]/40 text-[var(--neon-amber)]"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              {stats?.[f.value ?? ""] !== undefined && f.value && (
                <span className="ml-1.5 font-mono text-[10px] opacity-70">
                  {stats[f.value]}
                </span>
              )}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant="outline"
              size="sm"
              onClick={() => setStatus(f.value)}
              className={cn(
                "h-7 text-xs border transition-all",
                status === f.value
                  ? "bg-muted/50 border-foreground/20 text-foreground"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_120px_120px_140px] gap-4 px-4 py-3 border-b border-border/40 bg-muted/20 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span>级别</span>
          <span>标题 / 消息</span>
          <span>站点 / 区域</span>
          <span>状态</span>
          <span className="text-right">时间</span>
        </div>

        <div className="flex flex-col">
          {isLoading && !data && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <AlertSkeletonRow key={i} />
              ))}
            </>
          )}
          {error && (
            <div className="px-4 py-12 text-center text-sm text-[var(--neon-rose)]">
              加载失败：{(error as Error).message}
            </div>
          )}
          {data?.length === 0 && !isLoading && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              没有符合条件的告警
            </div>
          )}
          {data?.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: RecentAlertItem }) {
  const accent = alertLevelAccent(alert.level);
  const label = alertLevelLabel(alert.level);

  const accentMap: Record<string, string> = {
    rose: "var(--neon-rose)",
    amber: "var(--neon-amber)",
    cyan: "var(--neon-cyan)",
  };
  const color = accentMap[accent] ?? "var(--neon-cyan)";

  return (
    <div className="grid grid-cols-[90px_1fr_120px_120px_140px] gap-4 px-4 py-3 border-b border-border/20 hover:bg-muted/10 transition-colors items-start">
      <span
        className="inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
        style={{
          color,
          backgroundColor: `${color}14`,
          borderColor: `${color}33`,
        }}
      >
        {label}
      </span>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {alert.title}
        </span>
        <span className="text-[11px] text-muted-foreground line-clamp-2">
          {alert.message}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
        {alert.station_code && (
          <span className="font-mono text-[10px] text-foreground/70">
            {alert.station_code}
          </span>
        )}
        {alert.region_code && (
          <span className="font-mono text-[10px]">{alert.region_code}</span>
        )}
        {!alert.station_code && !alert.region_code && <span>—</span>}
      </div>

      <span
        className={cn(
          "inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
          alert.status === "open"
            ? "bg-[var(--neon-rose)]/10 text-[var(--neon-rose)] ring-[var(--neon-rose)]/20"
            : "bg-[var(--neon-lime)]/10 text-[var(--neon-lime)] ring-[var(--neon-lime)]/20"
        )}
      >
        {alert.status === "open" ? "未处理" : "已处理"}
      </span>

      <span className="text-right text-[11px] text-muted-foreground font-mono tabular-nums">
        {new Date(alert.created_at).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

function AlertSkeletonRow() {
  return (
    <div className="grid grid-cols-[90px_1fr_120px_120px_140px] gap-4 px-4 py-3 border-b border-border/20 items-start">
      <Skeleton className="h-5 w-12" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-14" />
      <Skeleton className="h-3 w-20 justify-self-end" />
    </div>
  );
}
