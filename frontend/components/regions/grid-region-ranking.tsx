"use client";

import { Grid3X3, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/common/empty-state";
import type { GridRegionItem } from "@/lib/api/client";
import { formatNumber, formatOccupancy } from "@/lib/format";
import { cn } from "@/lib/utils";

type GridRegionRankingProps = {
  items?: GridRegionItem[];
  topN?: number;
  isLoading?: boolean;
};

/**
 * 经纬度网格运营片区 Top N 卡片列表
 * 风格与首页 Operational Areas 面板保持一致
 */
export function GridRegionRanking({
  items,
  topN = 10,
  isLoading,
}: GridRegionRankingProps) {
  const top = [...(items ?? [])]
    .sort((a, b) => b.station_count - a.station_count)
    .slice(0, topN);
  const maxStation = top[0]?.station_count ?? 1;

  if (isLoading && !items) {
    return (
      <DashboardPanel
        eyebrow="Operational Areas"
        title="运营片区 · Top 10 站点规模"
        icon={<Grid3X3 className="h-4 w-4" strokeWidth={2.25} />}
        accent="violet"
        meta={
          <Badge
            variant="outline"
            className="gap-1 border-[var(--neon-violet)]/40 text-[var(--neon-violet)]"
          >
            <TrendingUp className="h-3 w-3" />
            加载中…
          </Badge>
        }
      >
        <ul className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-md border border-border/40 bg-card/40 px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-[var(--neon-violet)]/90">
                    #{i + 1}
                  </span>
                  <div className="h-4 w-32 animate-pulse rounded bg-muted/30" />
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-muted/25" />
            </li>
          ))}
        </ul>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel
      eyebrow="Operational Areas"
      title={`运营片区 · Top ${topN} 站点规模`}
      icon={<Grid3X3 className="h-4 w-4" strokeWidth={2.25} />}
      accent="violet"
      meta={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-[var(--neon-violet)]/40 text-[var(--neon-violet)]"
          >
            <TrendingUp className="h-3 w-3" />
            {items?.length ?? 0} 片区
          </Badge>
        </div>
      }
    >
      {top.length === 0 ? (
        <EmptyState
          title="暂无片区数据"
          description="后端尚未计算运营片区统计，请确认数据已初始化。"
          className="border-none bg-transparent"
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {top.map((a, idx) => {
            const ratio = a.station_count / Math.max(1, maxStation);
            return (
              <li
                key={a.grid_code}
                className="rounded-md border border-border/40 bg-card/40 px-3 py-2.5 transition-colors hover:border-[var(--neon-violet)]/40"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-[var(--neon-violet)]/90">
                      #{idx + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {a.label}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                    {formatNumber(a.station_count)}
                    <span className="ml-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      stations
                    </span>
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/25">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--neon-violet)] to-[var(--neon-cyan)] transition-[width] duration-500",
                      )}
                      style={{ width: `${(ratio * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {(ratio * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
                  <span>
                    单车{" "}
                    <span className="text-foreground/85">{formatNumber(a.available_bikes)}</span>
                  </span>
                  <span>
                    占用{" "}
                    <span className="text-foreground/85">
                      {formatOccupancy(a.avg_occupancy_rate)}
                    </span>
                  </span>
                  <span className="ml-auto">
                    容量{" "}
                    <span className="text-foreground/85">{formatNumber(a.capacity)}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
