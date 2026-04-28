import type { Metadata } from "next";

import { Activity } from "lucide-react";
import { TrendPanel } from "@/components/dashboard/trend-panel";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "历史趋势",
};

export default function TrendsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/25">
            <Activity className="h-4.5 w-4.5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">历史趋势</h1>
            <p className="text-xs text-muted-foreground">
              基于 fact_station_snapshot 时序事实表的 24h 趋势分析
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)]"
        >
          实时
        </Badge>
      </div>

      {/* Chart */}
      <TrendPanel />

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard
          title="数据粒度"
          value="1 小时"
          desc="每小时一个聚合桶"
          accent="cyan"
        />
        <InfoCard
          title="覆盖范围"
          value="24 小时"
          desc="滚动窗口，自动更新"
          accent="violet"
        />
        <InfoCard
          title="区域对比"
          value="Top 3"
          desc="按站点数排序的区域"
          accent="lime"
        />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  desc,
  accent,
}: {
  title: string;
  value: string;
  desc: string;
  accent: "cyan" | "violet" | "lime";
}) {
  const colorMap = {
    cyan: "var(--neon-cyan)",
    violet: "var(--neon-violet)",
    lime: "var(--neon-lime)",
  };
  const c = colorMap[accent];

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <div
        className="mt-2 text-2xl font-semibold tabular-nums"
        style={{ color: c }}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
