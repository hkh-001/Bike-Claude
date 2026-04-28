"use client";

import { cn } from "@/lib/utils";
import type { StationRiskType } from "@/lib/api/client";

/**
 * 地图图例：5 种 risk_type 与颜色 / 含义对照。
 * 颜色与 station-map.tsx 内 `riskColor` 保持完全一致。
 */
export const RISK_LEGEND: ReadonlyArray<{
  type: StationRiskType;
  label: string;
  color: string;
  desc: string;
}> = [
  {
    type: "normal",
    label: "正常",
    color: "var(--neon-cyan)",
    desc: "运行正常",
  },
  {
    type: "empty",
    label: "空车风险",
    color: "var(--neon-amber)",
    desc: "可借车 ≤ 1",
  },
  {
    type: "full",
    label: "满桩风险",
    color: "var(--neon-violet)",
    desc: "占用率 ≥ 95%",
  },
  {
    type: "abnormal",
    label: "异常",
    color: "var(--neon-rose)",
    desc: "维护 / 借还关闭",
  },
  {
    type: "offline",
    label: "离线",
    color: "#6b7280",
    desc: "已停用 / 无心跳",
  },
];

export function MapLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col gap-1.5 rounded-md border border-border/50",
        "bg-background/80 px-3 py-2.5 text-[11px] backdrop-blur-md",
        "shadow-lg shadow-black/20",
        className,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Risk Legend
      </div>
      <ul className="flex flex-col gap-1">
        {RISK_LEGEND.map((item) => (
          <li key={item.type} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: item.color,
                boxShadow: `0 0 8px ${item.color}`,
              }}
            />
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-muted-foreground">· {item.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
