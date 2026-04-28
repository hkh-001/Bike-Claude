"use client";

import { useState } from "react";
import { Map, TrendingUp, Grid3X3, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/common/empty-state";
import type {
  RegionRankingItem,
  OperationalAreaRankingItem,
} from "@/lib/api/client";
import { formatNumber, formatOccupancy } from "@/lib/format";
import { cn } from "@/lib/utils";

type ViewMode = "areas" | "regions";

type RegionRankingPanelProps = {
  operationalAreas?: OperationalAreaRankingItem[];
  regions?: RegionRankingItem[];
  topN?: number;
};

/**
 * 运营片区 / 官方区域 双视图面板：
 * - 默认展示 operational_area_ranking（派生网格片区）
 * - 可切换到 region_ranking（GBFS 官方区域）
 */
export function RegionRankingPanel({
  operationalAreas,
  regions,
  topN = 5,
}: RegionRankingPanelProps) {
  const [view, setView] = useState<ViewMode>("areas");

  const hasAreas = operationalAreas && operationalAreas.length > 0;
  const effectiveView: ViewMode = view === "areas" && hasAreas ? "areas" : "regions";

  if (effectiveView === "areas") {
    const top = [...operationalAreas!]
      .sort((a, b) => b.station_count - a.station_count)
      .slice(0, topN);
    const maxStation = top[0]?.station_count ?? 1;

    return (
      <DashboardPanel
        eyebrow="Operational Areas"
        title="运营片区 · Top 5 站点规模"
        icon={<Grid3X3 className="h-4 w-4" strokeWidth={2.25} />}
        accent="violet"
        meta={
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 border-[var(--neon-violet)]/40 text-[var(--neon-violet)]"
            >
              <TrendingUp className="h-3 w-3" />
              {operationalAreas!.length} 片区
            </Badge>
            {regions && regions.length > 0 && (
              <button
                onClick={() => setView("regions")}
                className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-card/70"
              >
                <Layers className="h-3 w-3" />
                官方区域
              </button>
            )}
          </div>
        }
      >
        {top.length === 0 ? (
          <EmptyState
            title="暂无片区数据"
            description="后端尚未计算运营片区统计。"
            className="border-none bg-transparent"
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {top.map((a, idx) => {
              const ratio = a.station_count / Math.max(1, maxStation);
              return (
                <li
                  key={a.area_id}
                  className="rounded-md border border-border/40 bg-card/40 px-3 py-2.5 transition-colors hover:border-[var(--neon-violet)]/40"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="font-mono text-[11px] tabular-nums text-[var(--neon-violet)]/90">
                        #{idx + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        {a.area_name}
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
                      <span className="text-foreground/85">{formatNumber(a.bikes_total)}</span>
                    </span>
                    <span>
                      占用{" "}
                      <span className="text-foreground/85">
                        {formatOccupancy(a.avg_occupancy)}
                      </span>
                    </span>
                    <span className="ml-auto">
                      容量{" "}
                      <span className="text-foreground/85">{formatNumber(a.capacity_total)}</span>
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

  // region_ranking fallback
  const top = [...(regions ?? [])]
    .sort((a, b) => b.station_count - a.station_count)
    .slice(0, topN);
  const maxStation = top[0]?.station_count ?? 1;

  return (
    <DashboardPanel
      eyebrow="Top Regions"
      title="区域运营 · Top 5 站点规模"
      icon={<Map className="h-4 w-4" strokeWidth={2.25} />}
      accent="violet"
      meta={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-[var(--neon-violet)]/40 text-[var(--neon-violet)]"
          >
            <TrendingUp className="h-3 w-3" />
            {regions?.length ?? 0} 区域
          </Badge>
          {hasAreas && (
            <button
              onClick={() => setView("areas")}
              className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-card/70"
            >
              <Grid3X3 className="h-3 w-3" />
              运营片区
            </button>
          )}
        </div>
      }
    >
      {top.length === 0 ? (
        <EmptyState
          title="暂无区域数据"
          description="后端尚未注入区域 / 站点统计。"
          className="border-none bg-transparent"
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {top.map((r, idx) => {
            const ratio = r.station_count / Math.max(1, maxStation);
            return (
              <li
                key={r.region_id}
                className="rounded-md border border-border/40 bg-card/40 px-3 py-2.5 transition-colors hover:border-[var(--neon-violet)]/40"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-[var(--neon-violet)]/90">
                      #{idx + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {r.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground/70">
                      {r.code}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                    {formatNumber(r.station_count)}
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
                    <span className="text-foreground/85">{formatNumber(r.bikes_total)}</span>
                  </span>
                  <span>
                    占用{" "}
                    <span className="text-foreground/85">{formatOccupancy(r.avg_occupancy)}</span>
                  </span>
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-1",
                      r.open_alerts > 0
                        ? "text-[var(--neon-amber)]"
                        : "text-muted-foreground/70",
                    )}
                  >
                    告警{" "}
                    <span className="font-medium">{r.open_alerts}</span>
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
