"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import EChartsReactCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

import { useDashboardTrends24h } from "@/lib/hooks/use-dashboard-trends";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatNumber, formatOccupancy } from "@/lib/format";
import type { DashboardTrend24h } from "@/lib/api/client";

// 一次注册（tree-shake 友好；若多次调用 use 也是幂等的）
echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

// 与首页其他面板（map / risk）保持同款 neon hex
const COLOR = {
  cyan: "#5cd2e6",
  violet: "#a87bf0",
  amber: "#f4b94a",
  lime: "#9ee76b",
  rose: "#ec6d72",
} as const;

const REGION_COLORS = [COLOR.violet, COLOR.amber, COLOR.lime];

/**
 * 24h 城市运营时序面板（M2.2-B）。
 *
 * - 数据：60s 轮询 `/api/dashboard/trends/24h`
 * - 视图：双 Y 轴折线 + 区域 Top 3 浅色折线
 *   左：城市可借车总数（cyan area-line）
 *   右：城市平均占用率（rose dashed-line, %）
 * - 三态：首次加载 skeleton / 首次失败 ErrorBlock / 后续失败保留旧数据
 */
export function TrendPanel({
  className,
  refetchInterval,
}: {
  className?: string;
  refetchInterval?: number;
}) {
  const { data, error, isLoading, isFetching, refetch } =
    useDashboardTrends24h(refetchInterval);

  return (
    <DashboardPanel
      eyebrow="TIME-SERIES · 24H"
      title="城市运营时序"
      icon={<Activity className="h-4 w-4" />}
      accent="cyan"
      meta={<TrendMetaChip data={data} isFetching={isFetching} />}
      className={className}
    >
      <div className="relative h-[260px] w-full overflow-hidden rounded-md border border-border/40 bg-[color-mix(in_oklch,var(--background)_75%,transparent)]">
        {isLoading && !data && <ChartSkeleton />}
        {error && !data && (
          <ErrorBlock
            onRetry={() => refetch()}
            message={(error as Error).message}
          />
        )}
        {data && <TrendChart data={data} />}
      </div>
    </DashboardPanel>
  );
}

// ---------------------------------------------------------------------------
// ECharts 渲染
// ---------------------------------------------------------------------------

function TrendChart({ data }: { data: DashboardTrend24h }) {
  const option = useMemo<EChartsOption>(() => buildOption(data), [data]);

  return (
    <EChartsReactCore
      echarts={echarts}
      option={option}
      style={{ height: "100%", width: "100%" }}
      notMerge
      lazyUpdate
      theme="bike-dark"
      opts={{ renderer: "canvas" }}
    />
  );
}

function buildOption(data: DashboardTrend24h): EChartsOption {
  const xAxisLabels = data.buckets.map((b) =>
    dayjs(b.ts).format("HH:00"),
  );
  const cityBikes = data.buckets.map((b) => b.city_total_bikes);
  const cityOccPct = data.buckets.map(
    (b) => Number((b.city_avg_occupancy * 100).toFixed(2)),
  );

  const series: NonNullable<EChartsOption["series"]> = [
    {
      name: "城市可借车",
      type: "line",
      yAxisIndex: 0,
      data: cityBikes,
      smooth: 0.28,
      symbol: "circle",
      symbolSize: 5,
      showSymbol: false,
      lineStyle: { color: COLOR.cyan, width: 2.2 },
      itemStyle: { color: COLOR.cyan },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(92, 210, 230, 0.32)" },
            { offset: 1, color: "rgba(92, 210, 230, 0.02)" },
          ],
        },
      },
      emphasis: { focus: "series" },
      z: 4,
    },
    {
      name: "城市占用率",
      type: "line",
      yAxisIndex: 1,
      data: cityOccPct,
      smooth: 0.28,
      symbol: "circle",
      symbolSize: 4,
      showSymbol: false,
      lineStyle: {
        color: COLOR.rose,
        width: 1.6,
        type: [4, 3],
      },
      itemStyle: { color: COLOR.rose },
      emphasis: { focus: "series" },
      z: 5,
    },
  ];

  data.region_series.forEach((rs, idx) => {
    const color = REGION_COLORS[idx % REGION_COLORS.length];
    series.push({
      name: rs.region_name,
      type: "line",
      yAxisIndex: 0,
      data: rs.points.map((p) => p.bikes_available),
      smooth: 0.28,
      symbol: "none",
      lineStyle: { color, width: 1.2, opacity: 0.85 },
      itemStyle: { color },
      emphasis: { focus: "series" },
      z: 2,
    });
  });

  return {
    backgroundColor: "transparent",
    animationDuration: 320,
    animationEasing: "cubicOut",
    grid: {
      top: 38,
      right: 56,
      bottom: 28,
      left: 52,
      containLabel: false,
    },
    legend: {
      top: 4,
      left: "center",
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 14,
      textStyle: {
        color: "rgba(229, 231, 235, 0.75)",
        fontSize: 11,
        fontFamily: "var(--font-sans), system-ui, sans-serif",
      },
      icon: "roundRect",
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(20, 22, 35, 0.92)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      padding: [8, 10],
      textStyle: {
        color: "#e5e7eb",
        fontSize: 11,
        fontFamily: "var(--font-sans), system-ui, sans-serif",
      },
      axisPointer: {
        type: "line",
        lineStyle: { color: "rgba(92,210,230,0.55)", width: 1, type: "dashed" },
      },
      formatter: (raw) => {
        const params = Array.isArray(raw) ? raw : [raw];
        const idx = params[0]?.dataIndex;
        if (idx == null) return "";
        const bucket = data.buckets[idx];
        if (!bucket) return "";
        const head = `<div style="font-size:11px;color:#9ca3af;letter-spacing:0.05em;margin-bottom:4px">${dayjs(
          bucket.ts,
        ).format("MM-DD HH:00")}</div>`;
        const rows = params
          .map((p) => {
            const isOcc = p.seriesName === "城市占用率";
            const valueText = isOcc
              ? `${(p.value as number).toFixed(1)}%`
              : formatNumber(p.value as number);
            return `
              <div style="display:flex;justify-content:space-between;gap:14px;align-items:center;font-size:11px;line-height:1.5">
                <span>
                  <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${
                    p.color
                  };margin-right:6px"></span>
                  ${escapeHtml(String(p.seriesName))}
                </span>
                <span style="font-variant-numeric:tabular-nums;font-weight:600">${valueText}</span>
              </div>`;
          })
          .join("");
        const alertChip = bucket.alerts_count
          ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);font-size:10px;color:${COLOR.amber}">
               <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${COLOR.amber};margin-right:5px"></span>
               该桶告警 ${bucket.alerts_count} 条
             </div>`
          : "";
        return `${head}${rows}${alertChip}`;
      },
    },
    xAxis: {
      type: "category",
      data: xAxisLabels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
      axisTick: { show: false },
      axisLabel: {
        color: "rgba(229, 231, 235, 0.55)",
        fontSize: 10,
        fontFamily: "var(--font-mono), ui-monospace",
        interval: 2, // 每 3h 一个 label，避免拥挤
      },
    },
    yAxis: [
      {
        type: "value",
        name: "可借车",
        nameTextStyle: {
          color: "rgba(229,231,235,0.55)",
          fontSize: 10,
          padding: [0, 0, 4, -28],
        },
        position: "left",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: "rgba(255,255,255,0.05)", type: "dashed" },
        },
        axisLabel: {
          color: "rgba(229, 231, 235, 0.55)",
          fontSize: 10,
          fontFamily: "var(--font-mono), ui-monospace",
          formatter: (v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`,
        },
      },
      {
        type: "value",
        name: "占用率",
        nameTextStyle: {
          color: "rgba(229,231,235,0.55)",
          fontSize: 10,
          padding: [0, -24, 4, 0],
        },
        position: "right",
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: "rgba(236,109,114,0.7)",
          fontSize: 10,
          fontFamily: "var(--font-mono), ui-monospace",
          formatter: "{value}%",
        },
      },
    ],
    series,
  };
}

// ---------------------------------------------------------------------------
// 子组件：辅助态 / meta
// ---------------------------------------------------------------------------

function TrendMetaChip({
  data,
  isFetching,
}: {
  data: DashboardTrend24h | undefined;
  isFetching: boolean;
}) {
  if (!data) {
    return (
      <span className="rounded-full border border-border/50 bg-card/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        加载中
      </span>
    );
  }

  const last = data.buckets[data.buckets.length - 1];
  const totalAlerts = data.buckets.reduce((s, b) => s + b.alerts_count, 0);

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-medium tabular-nums">
      <span className="rounded-full border border-border/50 bg-card/40 px-2 py-0.5 uppercase tracking-[0.18em] text-muted-foreground">
        24h · 1h
      </span>
      {last && (
        <span
          className="rounded-full border px-2 py-0.5"
          style={{
            borderColor: `${COLOR.cyan}55`,
            backgroundColor: `${COLOR.cyan}14`,
            color: COLOR.cyan,
          }}
        >
          当前 {formatNumber(last.city_total_bikes)} 辆 · {formatOccupancy(last.city_avg_occupancy)}
        </span>
      )}
      <span
        className="rounded-full border px-2 py-0.5"
        style={{
          borderColor: `${COLOR.amber}55`,
          backgroundColor: `${COLOR.amber}14`,
          color: COLOR.amber,
        }}
      >
        告警 {totalAlerts}
      </span>
      {isFetching && (
        <RefreshCw className="h-3 w-3 animate-spin text-[var(--neon-cyan)]" />
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col gap-2 p-4">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-full w-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          正在加载 24h 趋势数据…
        </span>
      </div>
    </div>
  );
}

function ErrorBlock({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="h-7 w-7 text-[var(--neon-rose)]" />
      <div className="text-sm font-medium text-foreground">趋势数据加载失败</div>
      <div className="max-w-xs text-xs text-muted-foreground">
        {message || "无法获取 /api/dashboard/trends/24h"}
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
