"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { useDashboardSummary } from "@/lib/hooks/use-dashboard-summary";
import { useAppSettings } from "@/lib/hooks/use-app-settings";
import { useEtlStatus } from "@/lib/hooks/use-etl-status";
import { ErrorState } from "@/components/common/error-state";
import { LiveTicker } from "@/components/dashboard/live-ticker";
import { DashboardNavDock } from "@/components/dashboard/dashboard-nav-dock";
import { KpiBar } from "@/components/dashboard/kpi-bar";
import { StationMap } from "@/components/dashboard/station-map";
import { TrendPanel } from "@/components/dashboard/trend-panel";
import { RiskPanel } from "@/components/dashboard/risk-panel";
import { RecentAlertsPanel } from "@/components/dashboard/recent-alerts-panel";
import { RegionRankingPanel } from "@/components/dashboard/region-ranking-panel";
import { EtlHealthStrip } from "@/components/dashboard/etl-health-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * 首页大屏装配层（M2.2-A 地图 + M2.2-B 趋势）：
 * 1. Summary 30s 轮询 / Geojson 30s 轮询 / Trends 60s 轮询（三条独立缓存键）
 * 2. 三态：首次加载 skeleton / 首次失败 ErrorState / 后续失败保留旧数据 + 顶部 banner
 *    （地图和趋势独立走自身三态，不阻塞 summary）
 * 3. 布局：
 *      LiveTicker
 *      KPI Bar (full width)
 *      ┌─ StationMap (xl:col-span-8) ─┬─ RecentAlerts (xl:col-span-4) ─┐
 *      ├─ TrendPanel (full width, 24h 双轴时序) ──────────────────────┤
 *      ├─ RiskPanel (xl:col-span-6) ──┼─ RegionRanking (xl:col-span-6) ┤
 *      └─ EtlHealthStrip (full width) ────────────────────────────────┘
 * 4. 各 section staggered fade-up（60ms 间隔，单次触发）
 */
export function DashboardShell() {
  const { settings } = useAppSettings();
  const { data, error, isLoading, isFetching, refetch } =
    useDashboardSummary(settings.dashboardRefreshInterval);
  const { data: etlStatus } = useEtlStatus(settings.dashboardRefreshInterval);

  // 首次加载且尚无任何数据 → 全屏 skeleton 大屏骨架
  if (isLoading && !data) {
    return (
      <div className="flex min-h-screen flex-col">
        <LiveTicker isFetching={true} />
        <DashboardNavDock />
        <main className="flex-1 px-4 py-4 md:pl-52 md:pr-6 md:py-5">
          <FullSkeleton />
        </main>
      </div>
    );
  }

  // 首次加载就失败 → 全屏 ErrorState
  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col">
        <LiveTicker isFetching={false} />
        <DashboardNavDock />
        <main className="flex-1 px-4 py-6 md:pl-52 md:pr-6">
          <div className="mx-auto max-w-3xl">
            <ErrorState
              title="无法加载首页大屏"
              description="后端 /api/dashboard/summary 请求失败，请确认后端 (uvicorn 8765) 已启动。"
              error={error}
              onRetry={() => refetch()}
            />
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <LiveTicker isFetching={isFetching} />
      <DashboardNavDock />

      {/* 后续失败 banner（不影响渲染旧数据） */}
      {error && data && (
        <div className="border-b border-[var(--neon-rose)]/30 bg-[color-mix(in_oklch,var(--neon-rose)_8%,transparent)] px-4 py-2 text-[11px] text-[var(--neon-rose)] md:px-6">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            数据刷新失败，正显示上次成功结果（{(error as Error).message ?? "未知错误"}）
          </span>
        </div>
      )}

      {/* 数据新鲜度 banner */}
      {etlStatus?.data_freshness === "stale" && (
        <div className="border-b border-[var(--neon-amber)]/30 bg-[color-mix(in_oklch,var(--neon-amber)_8%,transparent)] px-4 py-2 text-[11px] text-[var(--neon-amber)] md:px-6">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            真实数据已过期（{etlStatus.active_source_age_seconds
              ? `${Math.round(etlStatus.active_source_age_seconds / 60)} 分钟前`
              : "未知时间"}
            ），展示数据可能不准确
          </span>
        </div>
      )}
      {etlStatus?.data_freshness === "mock" && (
        <div className="border-b border-[var(--neon-cyan)]/30 bg-[color-mix(in_oklch,var(--neon-cyan)_8%,transparent)] px-4 py-2 text-[11px] text-[var(--neon-cyan)] md:px-6">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            当前使用 Mock 兜底数据
          </span>
        </div>
      )}

      <main className="flex-1 px-4 py-4 md:pl-52 md:pr-6 md:py-5">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
          <Section idx={0}>
            <KpiBar kpi={data.kpi} />
          </Section>

          {/* 主区：地图 + 最近告警 */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Section idx={1} className="xl:col-span-8">
              <StationMap refetchInterval={settings.dashboardRefreshInterval} />
            </Section>
            <Section idx={2} className="xl:col-span-4">
              <RecentAlertsPanel alerts={data.recent_alerts} />
            </Section>
          </div>

          {/* 趋势区：24h 双轴时序（M2.2-B） */}
          <Section idx={3}>
            <TrendPanel refetchInterval={settings.dashboardRefreshInterval} />
          </Section>

          {/* 次区：风险站点 + 区域排行 */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Section idx={4} className="xl:col-span-6">
              <RiskPanel stations={data.risk_stations} />
            </Section>
            <Section idx={5} className="xl:col-span-6">
              <RegionRankingPanel
                operationalAreas={data.operational_area_ranking}
                regions={data.region_ranking}
              />
            </Section>
          </div>

          <Section idx={6}>
            <EtlHealthStrip feeds={data.etl_health} />
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  children,
  idx,
  className,
}: {
  children: ReactNode;
  idx: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: idx * 0.06, ease: "easeOut" }}
      className={cn("flex flex-col", className)}
    >
      {children}
    </motion.div>
  );
}

function FullSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Skeleton className="xl:col-span-8 h-[540px] w-full" />
        <Skeleton className="xl:col-span-4 h-[540px] w-full" />
      </div>
      <Skeleton className="h-[300px] w-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Skeleton className="xl:col-span-6 h-[260px] w-full" />
        <Skeleton className="xl:col-span-6 h-[260px] w-full" />
      </div>
      <Skeleton className="h-[140px] w-full" />
    </div>
  );
}
