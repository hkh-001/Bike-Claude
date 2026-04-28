"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Bike,
  Clock4,
  Gauge,
  ParkingSquare,
} from "lucide-react";

import { MetricCard } from "@/components/common/metric-card";
import type { DashboardKPI } from "@/lib/api/client";
import { formatNumber, formatOccupancy } from "@/lib/format";
import { formatRelative } from "@/lib/time";

type KpiBarProps = {
  kpi: DashboardKPI;
};

/**
 * 6 张 KPI 横排：活跃站点 / 可用车 / 可用桩 / 占用率 / 告警合计 / 上次更新。
 * 数字部分 300ms tween；占用率与告警合计也参与 tween。
 */
export function KpiBar({ kpi }: KpiBarProps) {
  const totalAlerts =
    (kpi.alerts?.info ?? 0) +
    (kpi.alerts?.warning ?? 0) +
    (kpi.alerts?.critical ?? 0);

  const alertAccent = kpi.alerts?.critical
    ? "rose"
    : kpi.alerts?.warning
      ? "amber"
      : "cyan";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="活跃站点"
        accent="cyan"
        icon={<Activity className="h-3.5 w-3.5" strokeWidth={2.5} />}
        value={
          <TweenInteger
            value={kpi.active_stations}
            format={formatNumber}
          />
        }
        unit={`/ ${formatNumber(kpi.total_stations)}`}
        hint={`覆盖 ${formatNumber(kpi.total_stations)} 个站点`}
      />
      <MetricCard
        label="可用单车"
        accent="lime"
        icon={<Bike className="h-3.5 w-3.5" strokeWidth={2.5} />}
        value={
          <TweenInteger value={kpi.total_bikes_available} format={formatNumber} />
        }
        unit="辆"
        hint="全网当前实时库存"
      />
      <MetricCard
        label="可用桩位"
        accent="violet"
        icon={<ParkingSquare className="h-3.5 w-3.5" strokeWidth={2.5} />}
        value={
          <TweenInteger value={kpi.total_docks_available} format={formatNumber} />
        }
        unit="位"
        hint="可停回还的空桩数"
      />
      <MetricCard
        label="平均占用率"
        accent="amber"
        icon={<Gauge className="h-3.5 w-3.5" strokeWidth={2.5} />}
        value={
          <TweenDecimal
            value={kpi.avg_occupancy_rate ?? 0}
            digits={1}
            format={(v) => formatOccupancy(v, 1).replace("%", "")}
          />
        }
        unit="%"
        hint="bikes / capacity 加权平均"
      />
      <MetricCard
        label="活跃告警"
        accent={alertAccent}
        icon={<AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />}
        value={<TweenInteger value={totalAlerts} format={formatNumber} />}
        unit="条"
        hint={`紧急 ${kpi.alerts?.critical ?? 0} · 警告 ${kpi.alerts?.warning ?? 0} · 提示 ${kpi.alerts?.info ?? 0}`}
      />
      <MetricCard
        label="上次更新"
        accent="muted"
        icon={<Clock4 className="h-3.5 w-3.5" strokeWidth={2.5} />}
        value={
          <span className="font-mono text-2xl tabular-nums tracking-tight md:text-3xl">
            {formatRelative(kpi.last_updated)}
          </span>
        }
        hint={kpi.last_updated ?? "等待数据接入"}
      />
    </div>
  );
}

/** 整数 tween（300ms ease-out），display 用 format 函数渲染 */
function TweenInteger({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.3,
      ease: "easeOut",
    });
    const unsub = mv.on("change", (latest) => {
      setDisplay(format(Math.round(latest)));
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, format, mv]);

  return <span className="tabular-nums">{display}</span>;
}

/** 小数 tween（保留 digits 位） */
function TweenDecimal({
  value,
  digits,
  format,
}: {
  value: number;
  digits: number;
  format: (n: number) => string;
}) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.3,
      ease: "easeOut",
    });
    const unsub = mv.on("change", (latest) => {
      setDisplay(format(Number(latest.toFixed(digits + 2))));
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, digits, format, mv]);

  return <span className="tabular-nums">{display}</span>;
}
