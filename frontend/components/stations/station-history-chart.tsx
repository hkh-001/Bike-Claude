"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import EChartsReactCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { Activity } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatOccupancy } from "@/lib/format";
import type { StationHistoryResponse } from "@/lib/api/client";

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const COLOR = {
  cyan: "#5cd2e6",
  violet: "#a87bf0",
  rose: "#ec6d72",
} as const;

interface StationHistoryChartProps {
  data?: StationHistoryResponse;
  isLoading: boolean;
}

export function StationHistoryChart({ data, isLoading }: StationHistoryChartProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-[var(--neon-cyan)]" />
        <h3 className="text-sm font-semibold text-foreground">24h 历史趋势</h3>
        {data && (
          <span className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums">
            {data.points.length} 个数据点
          </span>
        )}
      </div>

      <div className="relative h-[240px] w-full overflow-hidden rounded-md border border-border/40 bg-[color-mix(in_oklch,var(--background)_75%,transparent)]">
        {isLoading && !data && <ChartSkeleton />}
        {data && data.points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              暂无历史数据
            </span>
          </div>
        )}
        {data && data.points.length > 0 && <HistoryChart data={data} />}
      </div>
    </div>
  );
}

function HistoryChart({ data }: { data: StationHistoryResponse }) {
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

function buildOption(data: StationHistoryResponse): EChartsOption {
  const xLabels = data.points.map((p) => dayjs(p.ts).format("HH:00"));
  const bikes = data.points.map((p) => p.bikes_available);
  const occPct = data.points.map((p) => Number((p.occupancy_rate * 100).toFixed(2)));

  return {
    backgroundColor: "transparent",
    animationDuration: 320,
    animationEasing: "cubicOut",
    grid: {
      top: 32,
      right: 48,
      bottom: 24,
      left: 44,
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
      },
      axisPointer: {
        type: "line",
        lineStyle: { color: "rgba(92,210,230,0.55)", width: 1, type: "dashed" },
      },
      formatter: (raw) => {
        const params = Array.isArray(raw) ? raw : [raw];
        const idx = params[0]?.dataIndex;
        if (idx == null) return "";
        const pt = data.points[idx];
        if (!pt) return "";
        const head = `<div style="font-size:11px;color:#9ca3af;letter-spacing:0.05em;margin-bottom:4px">${dayjs(pt.ts).format("MM-DD HH:00")}</div>`;
        const rows = params
          .map((p) => {
            const isOcc = p.seriesName === "占用率";
            const valueText = isOcc
              ? `${(p.value as number).toFixed(1)}%`
              : formatNumber(p.value as number);
            return `
              <div style="display:flex;justify-content:space-between;gap:14px;align-items:center;font-size:11px;line-height:1.5">
                <span>
                  <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px"></span>
                  ${String(p.seriesName)}
                </span>
                <span style="font-variant-numeric:tabular-nums;font-weight:600">${valueText}</span>
              </div>`;
          })
          .join("");
        return `${head}${rows}`;
      },
    },
    xAxis: {
      type: "category",
      data: xLabels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
      axisTick: { show: false },
      axisLabel: {
        color: "rgba(229, 231, 235, 0.55)",
        fontSize: 10,
        fontFamily: "var(--font-mono), ui-monospace",
        interval: 2,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "车辆",
        nameTextStyle: {
          color: "rgba(229,231,235,0.55)",
          fontSize: 10,
          padding: [0, 0, 4, -20],
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
        },
      },
      {
        type: "value",
        name: "占用率",
        nameTextStyle: {
          color: "rgba(229,231,235,0.55)",
          fontSize: 10,
          padding: [0, -20, 4, 0],
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
    series: [
      {
        name: "可借车",
        type: "line",
        yAxisIndex: 0,
        data: bikes,
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
              { offset: 0, color: "rgba(92, 210, 230, 0.28)" },
              { offset: 1, color: "rgba(92, 210, 230, 0.02)" },
            ],
          },
        },
        emphasis: { focus: "series" },
        z: 4,
      },
      {
        name: "占用率",
        type: "line",
        yAxisIndex: 1,
        data: occPct,
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
    ],
  };
}

function ChartSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col gap-2 p-4">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-full w-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          正在加载历史数据…
        </span>
      </div>
    </div>
  );
}
