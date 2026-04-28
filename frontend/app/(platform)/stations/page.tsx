"use client";

import { useState, useMemo } from "react";
import { MapPin, Filter, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useStations } from "@/lib/hooks/use-stations";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatNumber, formatOccupancy } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StationRiskType, RiskStationItem } from "@/lib/api/client";

const RISK_FILTERS: { label: string; value: StationRiskType | null }[] = [
  { label: "全部", value: null },
  { label: "正常", value: "normal" },
  { label: "空车", value: "empty" },
  { label: "满桩", value: "full" },
  { label: "离线", value: "offline" },
  { label: "异常", value: "abnormal" },
];

const RISK_ACCENT: Record<StationRiskType, string> = {
  normal: "var(--neon-lime)",
  empty: "var(--neon-amber)",
  full: "var(--neon-rose)",
  offline: "var(--neon-slate)",
  abnormal: "var(--neon-violet)",
};

const RISK_LABEL: Record<StationRiskType, string> = {
  normal: "正常",
  empty: "空车",
  full: "满桩",
  offline: "离线",
  abnormal: "异常",
};

export default function StationsPage() {
  const [filter, setFilter] = useState<StationRiskType | null>(null);
  const { data, isLoading, error } = useStations(filter);

  const stats = useMemo(() => {
    if (!data) return null;
    const byType = data.reduce<Record<string, number>>((acc, s) => {
      acc[s.risk_type] = (acc[s.risk_type] ?? 0) + 1;
      return acc;
    }, {});
    return { total: data.length, byType };
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/25">
            <MapPin className="h-4.5 w-4.5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">站点管理</h1>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.total} 个站点` : "加载中…"} · 实时状态监控
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] w-fit"
        >
          实时
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        {RISK_FILTERS.map((f) => (
          <Button
            key={f.label}
            variant="outline"
            size="sm"
            onClick={() => setFilter(f.value)}
            className={cn(
              "h-7 text-xs border transition-all",
              filter === f.value
                ? "bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)]"
                : "border-border/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {stats?.byType[f.value ?? "all"] !== undefined && f.value && (
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                {stats.byType[f.value]}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px_80px_100px_90px_60px] gap-4 px-4 py-3 border-b border-border/40 bg-muted/20 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span>站点</span>
          <span className="text-right">容量</span>
          <span className="text-right">可借</span>
          <span className="text-right">空桩</span>
          <span className="text-right">占用率</span>
          <span className="text-right">状态</span>
          <span />
        </div>

        <div className="flex flex-col">
          {isLoading && !data && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <StationSkeletonRow key={i} />
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
              没有符合条件的站点
            </div>
          )}
          {data?.map((s) => (
            <StationRow key={s.station_id} station={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StationRow({ station }: { station: RiskStationItem }) {
  const accent = RISK_ACCENT[station.risk_type];
  const label = RISK_LABEL[station.risk_type];

  return (
    <div className="grid grid-cols-[1fr_100px_80px_80px_100px_90px_60px] gap-4 px-4 py-3 border-b border-border/20 hover:bg-muted/10 transition-colors items-center">
      <Link href={`/stations/${station.code}`} className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {station.name}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
            {station.code}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground truncate">
          {station.region_name ?? "—"} · ({station.lat.toFixed(4)}, {station.lng.toFixed(4)})
        </span>
      </Link>
      <div className="text-right font-mono text-sm tabular-nums text-foreground">
        {formatNumber(station.capacity)}
      </div>
      <div className="text-right font-mono text-sm tabular-nums text-[var(--neon-cyan)]">
        {formatNumber(station.bikes_available)}
      </div>
      <div className="text-right font-mono text-sm tabular-nums text-[var(--neon-violet)]">
        {formatNumber(station.docks_available)}
      </div>
      <div className="text-right font-mono text-sm tabular-nums text-foreground">
        {formatOccupancy(station.occupancy_rate)}
      </div>
      <div className="text-right">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
          style={{
            color: accent,
            backgroundColor: `${accent}14`,
            borderColor: `${accent}33`,
          }}
        >
          {label}
        </span>
      </div>
      <Link
        href={`/stations/${station.code}`}
        className="flex items-center justify-end text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function StationSkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_100px_80px_80px_100px_90px_60px] gap-4 px-4 py-3 border-b border-border/20 items-center">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-10 justify-self-end" />
      <Skeleton className="h-4 w-8 justify-self-end" />
      <Skeleton className="h-4 w-8 justify-self-end" />
      <Skeleton className="h-4 w-12 justify-self-end" />
      <Skeleton className="h-4 w-14 justify-self-end" />
      <Skeleton className="h-4 w-4 justify-self-end" />
    </div>
  );
}
