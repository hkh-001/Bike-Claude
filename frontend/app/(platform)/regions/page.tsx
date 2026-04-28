"use client";

import { useMemo, useState, useRef, useEffect, Suspense } from "react";
import { Compass, ArrowUpDown, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRegions } from "@/lib/hooks/use-regions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatOccupancy } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RegionRankingItem } from "@/lib/api/client";

type SortKey =
  | "station_count"
  | "bikes_total"
  | "avg_occupancy"
  | "open_alerts"
  | "name";
type SortDir = "asc" | "desc";

export default function RegionsPage() {
  return (
    <Suspense fallback={<RegionsPageSkeleton />}>
      <RegionsContent />
    </Suspense>
  );
}

function RegionsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_120px_120px_100px] gap-4 px-4 py-3 border-b border-border/40 bg-muted/20">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <RegionSkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

function RegionsContent() {
  const { data, isLoading, error } = useRegions();
  const searchParams = useSearchParams();
  const highlightCode = searchParams.get("highlight");
  const [sortKey, setSortKey] = useState<SortKey>("open_alerts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    if (!data) return [];
    const arr = [...data];
    arr.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const na = Number(va ?? 0);
      const nb = Number(vb ?? 0);
      return sortDir === "asc" ? na - nb : nb - na;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const highlightedRegion = useMemo(() => {
    if (!highlightCode || !data) return null;
    return data.find((r) => r.code === highlightCode) || null;
  }, [highlightCode, data]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/25">
            <Compass className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">区域分析</h1>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.length} 个区域` : "加载中…"} · 按运营指标排序
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[var(--neon-violet)]/30 text-[var(--neon-violet)]"
        >
          实时
        </Badge>
      </div>

      {/* Highlight notice */}
      {highlightCode && highlightedRegion && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>
            已定位区域 <span className="font-mono font-semibold">{highlightCode}</span>（{highlightedRegion.name}）
          </span>
        </div>
      )}
      {highlightCode && !highlightedRegion && !isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>
            未找到区域 <span className="font-mono font-semibold">{highlightCode}</span>
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_120px_120px_100px] gap-4 px-4 py-3 border-b border-border/40 bg-muted/20 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <SortHeader label="区域" sortKey="name" active={sortKey} dir={sortDir} onToggle={toggleSort} />
          <SortHeader label="站点数" sortKey="station_count" active={sortKey} dir={sortDir} onToggle={toggleSort} align="right" />
          <SortHeader label="可用车" sortKey="bikes_total" active={sortKey} dir={sortDir} onToggle={toggleSort} align="right" />
          <SortHeader label="平均占用" sortKey="avg_occupancy" active={sortKey} dir={sortDir} onToggle={toggleSort} align="right" />
          <SortHeader label="未处理告警" sortKey="open_alerts" active={sortKey} dir={sortDir} onToggle={toggleSort} align="right" />
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {isLoading && !data && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <RegionSkeletonRow key={i} />
              ))}
            </>
          )}
          {error && (
            <div className="px-4 py-12 text-center text-sm text-[var(--neon-rose)]">
              加载失败：{(error as Error).message}
            </div>
          )}
          {sorted.map((r) => (
            <RegionRow
              key={r.region_id}
              region={r}
              isHighlighted={highlightCode === r.code}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onToggle,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onToggle: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <button
      onClick={() => onToggle(sortKey)}
      className={cn(
        "flex items-center gap-1 hover:text-foreground transition-colors",
        align === "right" && "justify-end",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      {isActive ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3 text-[var(--neon-violet)]" />
        ) : (
          <ArrowDown className="h-3 w-3 text-[var(--neon-violet)]" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

function RegionRow({
  region,
  isHighlighted,
}: {
  region: RegionRankingItem;
  isHighlighted?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={rowRef}
      className={cn(
        "grid grid-cols-[1fr_120px_120px_120px_100px] gap-4 px-4 py-3 border-b border-border/20 hover:bg-muted/10 transition-colors items-center",
        isHighlighted &&
          "bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/30",
      )}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {region.name}
          </span>
          <span
            className={cn(
              "shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded",
              isHighlighted
                ? "bg-violet-500/20 text-violet-300"
                : "text-muted-foreground/70 bg-muted/30",
            )}
          >
            {region.code}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">{region.city}</span>
      </div>
      <div className="text-right font-mono text-sm tabular-nums text-foreground">
        {formatNumber(region.station_count)}
      </div>
      <div className="text-right font-mono text-sm tabular-nums text-foreground">
        {formatNumber(region.bikes_total)}
      </div>
      <div className="text-right font-mono text-sm tabular-nums text-[var(--neon-cyan)]">
        {formatOccupancy(region.avg_occupancy)}
      </div>
      <div className="text-right">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-mono tabular-nums",
            region.open_alerts > 0
              ? "bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] ring-1 ring-[var(--neon-amber)]/20"
              : "text-muted-foreground/60",
          )}
        >
          {region.open_alerts}
        </span>
      </div>
    </div>
  );
}

function RegionSkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_120px_120px_120px_100px] gap-4 px-4 py-3 border-b border-border/20 items-center">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-12 justify-self-end" />
      <Skeleton className="h-4 w-12 justify-self-end" />
      <Skeleton className="h-4 w-14 justify-self-end" />
      <Skeleton className="h-4 w-8 justify-self-end" />
    </div>
  );
}
