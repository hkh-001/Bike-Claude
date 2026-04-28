"use client";

import { CheckCircle2, CircleAlert, Loader2, MinusCircle, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/common/empty-state";
import type { EtlFeedHealth } from "@/lib/api/client";
import {
  etlStatusAccent,
  etlStatusLabel,
  formatDuration,
} from "@/lib/format";
import { formatRelative, formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type EtlHealthStripProps = {
  feeds: EtlFeedHealth[];
};

const statusIcon: Record<string, LucideIcon> = {
  success: CheckCircle2,
  failed: CircleAlert,
  running: Loader2,
};

const accentBar = {
  lime: "bg-[var(--neon-lime)]",
  rose: "bg-[var(--neon-rose)]",
  cyan: "bg-[var(--neon-cyan)]",
  muted: "bg-muted-foreground/40",
} as const;

const accentText = {
  lime: "text-[var(--neon-lime)]",
  rose: "text-[var(--neon-rose)]",
  cyan: "text-[var(--neon-cyan)]",
  muted: "text-muted-foreground",
} as const;

const accentBorder = {
  lime: "border-[var(--neon-lime)]/40",
  rose: "border-[var(--neon-rose)]/45",
  cyan: "border-[var(--neon-cyan)]/40",
  muted: "border-border/55",
} as const;

export function EtlHealthStrip({ feeds }: EtlHealthStripProps) {
  if (feeds.length === 0) {
    return (
      <DashboardPanel
        eyebrow="Data Pipelines"
        title="ETL · 数据管道健康度"
        icon={<Workflow className="h-4 w-4" strokeWidth={2.25} />}
        accent="lime"
      >
        <EmptyState
          title="暂无 ETL 任务记录"
          description="后端尚未运行任何数据管道。"
          className="border-none bg-transparent"
        />
      </DashboardPanel>
    );
  }

  const totalFailures = feeds.reduce((acc, f) => acc + (f.recent_failures ?? 0), 0);

  return (
    <DashboardPanel
      eyebrow="Data Pipelines"
      title="ETL · 数据管道健康度"
      icon={<Workflow className="h-4 w-4" strokeWidth={2.25} />}
      accent={totalFailures > 0 ? "rose" : "lime"}
      meta={
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums tracking-[0.14em]",
            totalFailures > 0
              ? cn(accentBorder.rose, accentText.rose)
              : cn(accentBorder.lime, accentText.lime),
          )}
        >
          {feeds.length} feeds · {totalFailures} fail/24h
        </span>
      }
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {feeds.map((feed) => {
          const accent = etlStatusAccent(feed.last_status);
          const Icon = feed.last_status ? statusIcon[feed.last_status] ?? MinusCircle : MinusCircle;
          const fails = feed.recent_failures ?? 0;

          return (
            <li
              key={feed.feed_id}
              className={cn(
                "group relative flex flex-col gap-1.5 overflow-hidden rounded-md border bg-card/40 p-2.5 transition-colors",
                accentBorder[accent],
                "hover:bg-card/70",
              )}
            >
              <span className={cn("absolute inset-y-2 left-0 w-[2px] rounded-full", accentBar[accent])} />

              <div className="flex items-center justify-between pl-2">
                <span className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {feed.source_name}
                </span>
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    accentText[accent],
                    feed.last_status === "running" && "animate-spin",
                  )}
                  strokeWidth={2.25}
                />
              </div>

              <div className="pl-2 text-sm font-medium text-foreground">
                <span className="truncate">{feed.feed_name}</span>
              </div>

              <div className="flex items-center justify-between pl-2 font-mono text-[10px] tabular-nums">
                <span className={cn(accentText[accent])}>
                  {etlStatusLabel(feed.last_status)}
                </span>
                <span className="text-muted-foreground">
                  {formatDuration(feed.last_duration_ms)}
                </span>
              </div>

              <div
                className="flex items-center justify-between pl-2 text-[10px] text-muted-foreground"
                title={formatDateTime(feed.last_started_at)}
              >
                <span>{formatRelative(feed.last_started_at)}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    fails > 0 ? "text-[var(--neon-rose)]" : "text-muted-foreground/70",
                  )}
                >
                  {fails} fail
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardPanel>
  );
}
