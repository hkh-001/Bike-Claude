"use client";

import { useMemo, useState, useRef, useEffect, Suspense } from "react";
import {
  Compass,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Layers,
  Grid3X3,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRegions } from "@/lib/hooks/use-regions";
import { useGridRegions } from "@/lib/hooks/use-grid-regions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GridRegionRanking } from "@/components/regions/grid-region-ranking";
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

type ViewTab = "official" | "grid";

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
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
      <Skeleton className="h-9 w-56 rounded-lg" />
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
  const [activeTab, setActiveTab] = useState<ViewTab>("official");
  const { data, isLoading, error } = useRegions();
  const {
    data: gridData,
    isLoading: gridLoading,
    error: gridError,
  } = useGridRegions();
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
              支持官方区域与经纬度运营片区两种统计口径
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

      {/* Highlight notice (跨 Tab 显示) */}
      {highlightCode && highlightedRegion && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>
            已定位区域{" "}
            <span className="font-mono font-semibold">{highlightCode}</span>（
            {highlightedRegion.name}）
          </span>
        </div>
      )}
      {highlightCode && !highlightedRegion && !isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>
            未找到区域{" "}
            <span className="font-mono font-semibold">{highlightCode}</span>
          </span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-card/40 p-1 w-fit">
        <TabButton
          active={activeTab === "official"}
          onClick={() => setActiveTab("official")}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="官方区域"
        />
        <TabButton
          active={activeTab === "grid"}
          onClick={() => setActiveTab("grid")}
          icon={<Grid3X3 className="h-3.5 w-3.5" />}
          label="运营片区"
        />
      </div>

      {/* Tab: 官方区域 */}
      {activeTab === "official" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">
              官方区域统计
            </h2>
            <p className="text-xs text-muted-foreground">
              基于 GBFS 官方区域或数据源 fallback 区域聚合，当前共{" "}
              {data?.length ?? 0} 个区域。
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_120px_120px_120px_100px] gap-4 px-4 py-3 border-b border-border/40 bg-muted/20 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <SortHeader
                label="区域"
                sortKey="name"
                active={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
              />
              <SortHeader
                label="站点数"
                sortKey="station_count"
                active={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="可用车"
                sortKey="bikes_total"
                active={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="平均占用"
                sortKey="avg_occupancy"
                active={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="未处理告警"
                sortKey="open_alerts"
                active={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
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
      )}

      {/* Tab: 运营片区 */}
      {activeTab === "grid" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">
              运营片区统计
            </h2>
            <p className="text-xs text-muted-foreground">
              基于站点经纬度进行网格化划分（round(lat, 2) × round(lon,
              2)），用于观察更细粒度的空间供需分布。
            </p>
          </div>

          {gridError ? (
            <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-12 text-center text-sm text-[var(--neon-rose)]">
              加载失败：{(gridError as Error).message}
            </div>
          ) : (
            <GridRegionRanking
              items={gridData?.items}
              topN={10}
              isLoading={gridLoading && !gridData}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/25"
          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
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
        isActive ? "text-foreground" : "text-muted-foreground",
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
        <span className="text-[11px] text-muted-foreground">
          {region.city}
        </span>
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
