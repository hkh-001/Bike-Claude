"use client";

import { BatteryWarning, ParkingMeter, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/common/empty-state";
import type { RiskStationItem } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatOccupancy } from "@/lib/format";

type RiskPanelProps = {
  stations: RiskStationItem[];
  /** 每列展示数量上限 */
  topN?: number;
};

/**
 * 空车 + 满桩双列。
 * - 空车（empty）：bikes_available 极少，bar 反向显示「空缺度」
 * - 满桩（full）：docks_available 极少，bar 正向显示「占满度」
 *
 * 数据来源：dashboard summary 的 risk_stations（已包含两类）。
 */
export function RiskPanel({ stations, topN = 5 }: RiskPanelProps) {
  const router = useRouter();

  const handleFocus = (code: string) => {
    router.push(`/?focusStation=${encodeURIComponent(code)}`, { scroll: false });
  };

  const empty = stations
    .filter((s) => s.risk_type === "empty")
    .sort((a, b) => a.bikes_available - b.bikes_available)
    .slice(0, topN);
  const full = stations
    .filter((s) => s.risk_type === "full")
    .sort((a, b) => a.docks_available - b.docks_available)
    .slice(0, topN);

  return (
    <DashboardPanel
      eyebrow="Risk Watch"
      title="重点站点 · 空车 / 满桩"
      icon={<BatteryWarning className="h-4 w-4" strokeWidth={2.25} />}
      meta={
        <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
          <Badge
            variant="outline"
            className="border-[var(--neon-rose)]/40 text-[var(--neon-rose)]"
          >
            {empty.length} 空
          </Badge>
          <Badge
            variant="outline"
            className="border-[var(--neon-amber)]/40 text-[var(--neon-amber)]"
          >
            {full.length} 满
          </Badge>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <RiskColumn
          title="空车风险（缺货）"
          accent="rose"
          icon={<BatteryWarning className="h-3.5 w-3.5" />}
          items={empty}
          onItemFocus={handleFocus}
          metric={(s) => s.bikes_available}
          metricLabel={(s) => `${s.bikes_available} / ${s.capacity}`}
          fillRatio={(s) =>
            // bar 表示「空缺度」：空越多越宽
            Math.max(0, Math.min(1, 1 - s.bikes_available / Math.max(1, s.capacity)))
          }
          subline={(s) =>
            `${s.region_name ?? "—"} · 占用 ${formatOccupancy(s.occupancy_rate)}`
          }
        />
        <RiskColumn
          title="满桩风险（无桩可还）"
          accent="amber"
          icon={<ParkingMeter className="h-3.5 w-3.5" />}
          items={full}
          onItemFocus={handleFocus}
          metric={(s) => s.docks_available}
          metricLabel={(s) => `${s.docks_available} / ${s.capacity}`}
          fillRatio={(s) =>
            // bar 表示「占满度」：可用桩越少 bar 越满
            Math.max(0, Math.min(1, 1 - s.docks_available / Math.max(1, s.capacity)))
          }
          subline={(s) =>
            `${s.region_name ?? "—"} · 占用 ${formatOccupancy(s.occupancy_rate)}`
          }
        />
      </div>
    </DashboardPanel>
  );
}

type Accent = "rose" | "amber";

const accentBar: Record<Accent, string> = {
  rose: "bg-[var(--neon-rose)]",
  amber: "bg-[var(--neon-amber)]",
};
const accentText: Record<Accent, string> = {
  rose: "text-[var(--neon-rose)]",
  amber: "text-[var(--neon-amber)]",
};

function RiskColumn<T>({
  title,
  accent,
  icon,
  items,
  onItemFocus,
  metric,
  metricLabel,
  fillRatio,
  subline,
}: {
  title: string;
  accent: Accent;
  icon: React.ReactNode;
  items: T[];
  onItemFocus?: (code: string) => void;
  metric: (item: T) => number;
  metricLabel: (item: T) => string;
  fillRatio: (item: T) => number;
  subline: (item: T) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className={cn("flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]", accentText[accent])}>
          {icon}
          {title}
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          Top {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="暂无风险站点"
          description="当前阈值下没有匹配的告警站点。"
          className="border-none bg-transparent"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const ratio = fillRatio(item);
            // 类型上 T 没有 station_id，但本组件只在 RiskStationItem 列表上调用，
            // 通过类型断言取 key 字段
            const station = item as unknown as { station_id: number; code: string; name: string };
            return (
              <li
                key={station.station_id}
                onClick={() => onItemFocus?.(station.code)}
                className="rounded-md border border-border/40 bg-card/40 px-3 py-2 transition-colors hover:border-border/70 cursor-pointer"
                title="点击在地图中定位"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {station.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground/70">
                      {station.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={cn("font-mono text-sm tabular-nums", accentText[accent])}>
                      {metricLabel(item)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemFocus?.(station.code);
                      }}
                      className="flex items-center justify-center rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-[var(--neon-cyan)]/10 hover:text-[var(--neon-cyan)]"
                      title="在地图中定位"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      href={`/stations/${station.code}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-[var(--neon-violet)]/10 hover:text-[var(--neon-violet)]"
                      title="查看详情"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-500", accentBar[accent])}
                      style={{ width: `${(ratio * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {(ratio * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-muted-foreground">
                  {subline(item)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
