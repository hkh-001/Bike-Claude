"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPinned,
  Bike,
  BellRing,
  LineChart,
  DatabaseZap,
  Settings,
  ArrowRight,
  AlertTriangle,
  MinusCircle,
  Moon,
  Sun,
  Monitor,
  Activity,
  Gauge,
  Zap,
  Radio,
  Clock4,
  Grid3X3,
} from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegions } from "@/lib/hooks/use-regions";
import { useStations } from "@/lib/hooks/use-stations";
import { useAlerts } from "@/lib/hooks/use-alerts";
import { useDashboardTrends24h } from "@/lib/hooks/use-dashboard-trends";
import { useEtlStatus } from "@/lib/hooks/use-etl-status";
import { useAppSettings } from "@/lib/hooks/use-app-settings";
import {
  alertLevelAccent,
  alertLevelLabel,
  formatOccupancy,
} from "@/lib/format";
import { formatRelative } from "@/lib/time";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CommandPanel =
  | "regions"
  | "stations"
  | "alerts"
  | "trends"
  | "etl"
  | "settings";

interface DashboardCommandDrawerProps {
  panel: CommandPanel | null;
  onOpenChange: (open: boolean) => void;
}

export function DashboardCommandDrawer({
  panel,
  onOpenChange,
}: DashboardCommandDrawerProps) {
  const open = panel !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col border-l border-[var(--neon-cyan)]/20 bg-[#0a0d18]/95 p-0 backdrop-blur-xl",
          "sm:max-w-[420px] xl:max-w-[480px]",
        )}
      >
        {panel === "regions" && <RegionsDrawer />}
        {panel === "stations" && <StationsDrawer />}
        {panel === "alerts" && <AlertsDrawer />}
        {panel === "trends" && <TrendsDrawer />}
        {panel === "etl" && <EtlDrawer />}
        {panel === "settings" && <SettingsDrawer />}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Drawer Header & Footer helpers
// ---------------------------------------------------------------------------

function DrawerHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--neon-cyan)]/[0.08] ring-1 ring-[var(--neon-cyan)]/20">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function DrawerFooter({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-auto border-t border-white/[0.06] px-5 py-4">
      <Link href={href} className="block">
        <Button
          variant="outline"
          className="w-full gap-2 border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/[0.05] text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 hover:border-[var(--neon-cyan)]/50"
        >
          {label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

function DrawerScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regions Panel
// ---------------------------------------------------------------------------

function RegionsDrawer() {
  const { data, isLoading } = useRegions();
  const top = [...(data ?? [])]
    .sort((a, b) => b.station_count - a.station_count)
    .slice(0, 6);
  const maxStation = top[0]?.station_count ?? 1;

  return (
    <>
      <DrawerHeader
        icon={<MapPinned className="h-4 w-4 text-[var(--neon-cyan)]" />}
        title="区域运营概览"
        subtitle={`${data?.length ?? 0} 个运营区域 · 实时数据`}
      />
      <DrawerScroll>
        {isLoading && !data && <PanelSkeleton count={5} />}
        {top.length === 0 && !isLoading && (
          <EmptyState text="暂无区域数据" />
        )}
        <ul className="flex flex-col gap-2.5">
          {top.map((r, idx) => {
            const ratio = r.station_count / Math.max(1, maxStation);
            return (
              <li
                key={r.region_id}
                className="rounded-md border border-border/40 bg-card/40 px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-[var(--neon-violet)]/90">
                      #{idx + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {r.name}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                    {formatNumber(r.station_count)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/25">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--neon-violet)] to-[var(--neon-cyan)]"
                      style={{ width: `${(ratio * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {(ratio * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
                  <span>
                    单车{" "}
                    <span className="text-foreground/85">
                      {formatNumber(r.bikes_total)}
                    </span>
                  </span>
                  <span>
                    占用{" "}
                    <span className="text-foreground/85">
                      {formatOccupancy(r.avg_occupancy)}
                    </span>
                  </span>
                  {r.open_alerts > 0 && (
                    <span className="ml-auto text-[var(--neon-amber)]">
                      告警 {r.open_alerts}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </DrawerScroll>
      <DrawerFooter href="/regions" label="进入区域分析" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Stations Panel
// ---------------------------------------------------------------------------

function StationsDrawer() {
  const router = useRouter();
  const { data: emptyData, isLoading: emptyLoading } = useStations("empty");
  const { data: fullData, isLoading: fullLoading } = useStations("full");

  const empty = [...(emptyData ?? [])]
    .sort((a, b) => a.bikes_available - b.bikes_available)
    .slice(0, 5);
  const full = [...(fullData ?? [])]
    .sort((a, b) => a.docks_available - b.docks_available)
    .slice(0, 5);

  const handleFocus = (code: string) => {
    router.push(`/?focusStation=${encodeURIComponent(code)}`, {
      scroll: false,
    });
  };

  return (
    <>
      <DrawerHeader
        icon={<Bike className="h-4 w-4 text-[var(--neon-cyan)]" />}
        title="站点状态速览"
        subtitle={`空车 ${empty.length} · 满桩 ${full.length} · 点击定位`}
      />
      <DrawerScroll>
        {(emptyLoading || fullLoading) && (!emptyData || !fullData) && (
          <PanelSkeleton count={4} />
        )}

        {/* 空车 */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--neon-rose)]">
            <AlertTriangle className="h-3.5 w-3.5" />
            空车风险（缺货）
          </div>
          {empty.length === 0 ? (
            <EmptyState text="暂无空车风险站点" />
          ) : (
            <ul className="flex flex-col gap-2">
              {empty.map((s) => (
                <li
                  key={s.station_id}
                  onClick={() => handleFocus(s.code)}
                  className="cursor-pointer rounded-md border border-border/40 bg-card/40 px-3 py-2 transition-colors hover:border-[var(--neon-rose)]/40"
                  title="点击在地图中定位"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {s.name}
                    </span>
                    <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--neon-rose)]">
                      {s.bikes_available} / {s.capacity}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {s.region_name ?? "—"} · 占用 {formatOccupancy(s.occupancy_rate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 满桩 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--neon-amber)]">
            <AlertTriangle className="h-3.5 w-3.5" />
            满桩风险（无桩可还）
          </div>
          {full.length === 0 ? (
            <EmptyState text="暂无满桩风险站点" />
          ) : (
            <ul className="flex flex-col gap-2">
              {full.map((s) => (
                <li
                  key={s.station_id}
                  onClick={() => handleFocus(s.code)}
                  className="cursor-pointer rounded-md border border-border/40 bg-card/40 px-3 py-2 transition-colors hover:border-[var(--neon-amber)]/40"
                  title="点击在地图中定位"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {s.name}
                    </span>
                    <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--neon-amber)]">
                      {s.docks_available} / {s.capacity}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {s.region_name ?? "—"} · 占用 {formatOccupancy(s.occupancy_rate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerScroll>
      <DrawerFooter href="/stations" label="进入站点列表" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Alerts Panel
// ---------------------------------------------------------------------------

function AlertsDrawer() {
  const { data, isLoading } = useAlerts(null, "open", 20);
  const list = (data ?? []).slice(0, 10);
  const counts = (data ?? []).reduce(
    (acc, a) => {
      acc[a.level] = (acc[a.level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <DrawerHeader
        icon={<BellRing className="h-4 w-4 text-[var(--neon-cyan)]" />}
        title="告警中心"
        subtitle={`未处理 ${data?.length ?? 0} 条 · 紧急 ${counts.critical ?? 0} · 警告 ${counts.warning ?? 0}`}
      />
      <DrawerScroll>
        {isLoading && !data && <PanelSkeleton count={5} />}
        {list.length === 0 && !isLoading && (
          <EmptyState text="暂无未处理告警" />
        )}
        <ul className="flex flex-col">
          {list.map((alert, idx) => {
            const accent = alertLevelAccent(alert.level);
            const isLast = idx === list.length - 1;
            return (
              <li
                key={alert.id}
                className={cn(
                  "flex gap-3 py-3 transition-colors",
                  !isLast && "border-b border-border/40",
                )}
              >
                <div className="flex flex-col items-center pt-0.5">
                  <span
                    className={cn("h-1.5 w-1.5 shrink-0 rounded-full", {
                      "bg-[var(--neon-rose)]": accent === "rose",
                      "bg-[var(--neon-amber)]": accent === "amber",
                      "bg-[var(--neon-cyan)]": accent === "cyan",
                    })}
                  />
                  {!isLast && (
                    <span className="mt-1 w-px flex-1 bg-border/40" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-[0.16em]",
                        accent === "rose" && "text-[var(--neon-rose)]",
                        accent === "amber" && "text-[var(--neon-amber)]",
                        accent === "cyan" && "text-[var(--neon-cyan)]",
                      )}
                    >
                      {alertLevelLabel(alert.level)}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {alert.title}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80">
                    {alert.station_code && (
                      <span className="font-mono">{alert.station_code}</span>
                    )}
                    <span className="ml-auto tabular-nums">
                      {formatRelative(alert.created_at)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </DrawerScroll>
      <DrawerFooter href="/alerts" label="进入告警中心" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Trends Panel
// ---------------------------------------------------------------------------

function TrendsDrawer() {
  const { data, isLoading } = useDashboardTrends24h(60_000);
  const last = data?.buckets[data.buckets.length - 1];
  const totalAlerts = data?.buckets.reduce(
    (s, b) => s + b.alerts_count,
    0,
  );

  return (
    <>
      <DrawerHeader
        icon={<LineChart className="h-4 w-4 text-[var(--neon-cyan)]" />}
        title="24h 趋势摘要"
        subtitle="城市运营时序 · 1h 桶聚合"
      />
      <DrawerScroll>
        {isLoading && !data && <PanelSkeleton count={4} />}
        {!data && !isLoading && <EmptyState text="暂无趋势数据" />}

        {last && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <MiniKpi
              label="当前可借车"
              value={formatNumber(last.city_total_bikes)}
              unit="辆"
              accent="cyan"
              icon={<Bike className="h-3 w-3" />}
            />
            <MiniKpi
              label="平均占用率"
              value={formatOccupancy(last.city_avg_occupancy)}
              accent="amber"
              icon={<Gauge className="h-3 w-3" />}
            />
            <MiniKpi
              label="24h 告警"
              value={String(totalAlerts ?? 0)}
              unit="条"
              accent="rose"
              icon={<BellRing className="h-3 w-3" />}
            />
            <MiniKpi
              label="数据点"
              value={String(data?.buckets.length ?? 0)}
              unit="桶"
              accent="violet"
              icon={<Clock4 className="h-3 w-3" />}
            />
          </div>
        )}

        {data && data.region_series.length > 0 && (
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            区域 Top 3 趋势
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {data?.region_series.slice(0, 3).map((rs) => {
            const latest = rs.points[rs.points.length - 1];
            const earliest = rs.points[0];
            const change = latest && earliest
              ? latest.bikes_available - earliest.bikes_available
              : 0;
            return (
              <li
                key={rs.region_code}
                className="rounded-md border border-border/40 bg-card/40 px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {rs.region_name}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-foreground">
                    {latest ? formatNumber(latest.bikes_available) : "—"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    占用{" "}
                    {latest ? formatOccupancy(latest.avg_occupancy) : "—"}
                  </span>
                  <span
                    className={cn(
                      "ml-auto font-mono tabular-nums",
                      change > 0
                        ? "text-[var(--neon-lime)]"
                        : change < 0
                          ? "text-[var(--neon-rose)]"
                          : "text-muted-foreground",
                    )}
                  >
                    {change > 0 ? "+" : ""}
                    {formatNumber(change)} 辆
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </DrawerScroll>
      <DrawerFooter href="/trends" label="进入趋势分析" />
    </>
  );
}

// ---------------------------------------------------------------------------
// ETL Panel
// ---------------------------------------------------------------------------

function EtlDrawer() {
  const { data: etlStatus } = useEtlStatus(30_000);

  const freshness = etlStatus?.data_freshness ?? "mock";
  const freshnessLabel = {
    fresh: { text: "数据新鲜", accent: "lime" as const },
    stale: { text: "数据过期", accent: "amber" as const },
    mock: { text: "Mock 数据", accent: "cyan" as const },
  }[freshness];

  return (
    <>
      <DrawerHeader
        icon={<DatabaseZap className="h-4 w-4 text-[var(--neon-cyan)]" />}
        title="ETL 数据管道"
        subtitle="数据抓取 · 调度 · 健康度"
      />
      <DrawerScroll>
        {/* 状态卡片 */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <MiniKpi
            label="数据新鲜度"
            value={freshnessLabel.text}
            accent={freshnessLabel.accent}
            icon={<Activity className="h-3 w-3" />}
          />
          <MiniKpi
            label="活跃数据源"
            value={etlStatus?.active_source ?? "—"}
            accent="violet"
            icon={<Radio className="h-3 w-3" />}
          />
          <MiniKpi
            label="站点总数"
            value={formatNumber(etlStatus?.total_stations ?? 0)}
            unit="个"
            accent="cyan"
            icon={<Grid3X3 className="h-3 w-3" />}
          />
          <MiniKpi
            label="最近抓取"
            value={
              etlStatus?.last_success_fetch_at
                ? formatRelative(etlStatus.last_success_fetch_at)
                : "—"
            }
            accent="amber"
            icon={<Clock4 className="h-3 w-3" />}
          />
        </div>

        {/* 数据源列表 */}
        {etlStatus?.sources && etlStatus.sources.length > 0 && (
          <>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              数据源
            </div>
            <ul className="flex flex-col gap-2">
              {etlStatus.sources.map((source) => (
                <li
                  key={source.id}
                  className="rounded-md border border-border/40 bg-card/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {source.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px]",
                        source.enabled
                          ? "bg-[var(--neon-lime)]/10 text-[var(--neon-lime)]"
                          : "bg-muted/30 text-muted-foreground",
                      )}
                    >
                      {source.enabled ? "启用" : "禁用"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono">{source.code}</span>
                    <span className="tabular-nums">
                      {source.city ?? "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {source.last_fetch_at
                      ? `最近抓取 ${formatRelative(source.last_fetch_at)}`
                      : "尚未抓取"}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* 调度器状态 */}
        <div className="mt-4 rounded-md border border-border/40 bg-card/40 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              APScheduler
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px]",
                etlStatus?.scheduler_running
                  ? "bg-[var(--neon-lime)]/10 text-[var(--neon-lime)]"
                  : "bg-[var(--neon-rose)]/10 text-[var(--neon-rose)]",
              )}
            >
              {etlStatus?.scheduler_running ? "运行中" : "已停止"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            自动调度{" "}
            {etlStatus?.scheduler_enabled ? "已启用" : "已禁用"}
          </div>
        </div>
      </DrawerScroll>
      <DrawerFooter href="/etl" label="进入 ETL 管理" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Settings Panel
// ---------------------------------------------------------------------------

function SettingsDrawer() {
  const { settings, update } = useAppSettings();

  return (
    <>
      <DrawerHeader
        icon={<Settings className="h-4 w-4 text-[var(--neon-cyan)]" />}
        title="快速设置"
        subtitle="主题 · 刷新间隔 · 告警阈值"
      />
      <DrawerScroll>
        <div className="flex flex-col gap-5">
          {/* 主题 */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              主题模式
            </div>
            <div className="flex gap-2">
              <SettingThemeButton
                active={settings.themeMode === "light"}
                onClick={() => update("themeMode", "light")}
                icon={<Sun className="h-3.5 w-3.5" />}
                label="亮色"
              />
              <SettingThemeButton
                active={settings.themeMode === "dark"}
                onClick={() => update("themeMode", "dark")}
                icon={<Moon className="h-3.5 w-3.5" />}
                label="暗色"
              />
              <SettingThemeButton
                active={settings.themeMode === "system"}
                onClick={() => update("themeMode", "system")}
                icon={<Monitor className="h-3.5 w-3.5" />}
                label="系统"
              />
            </div>
          </div>

          {/* 刷新间隔 */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              大屏刷新间隔
            </div>
            <div className="flex gap-2">
              {[15_000, 30_000, 60_000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => update("dashboardRefreshInterval", ms)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors",
                    settings.dashboardRefreshInterval === ms
                      ? "border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70",
                  )}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>

          {/* 告警阈值 */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              空车阈值
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={settings.emptyBikeThreshold}
                onChange={(e) =>
                  update("emptyBikeThreshold", Number(e.target.value))
                }
                className="flex-1 accent-[var(--neon-cyan)]"
              />
              <span className="w-8 text-right font-mono text-sm text-[var(--neon-cyan)]">
                {settings.emptyBikeThreshold}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              满桩阈值
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={80}
                max={100}
                step={5}
                value={Math.round(settings.fullOccupancyThreshold * 100)}
                onChange={(e) =>
                  update("fullOccupancyThreshold", Number(e.target.value) / 100)
                }
                className="flex-1 accent-[var(--neon-amber)]"
              />
              <span className="w-10 text-right font-mono text-sm text-[var(--neon-amber)]">
                {Math.round(settings.fullOccupancyThreshold * 100)}%
              </span>
            </div>
          </div>

          {/* AI */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              AI 助手
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[var(--neon-violet)]" />
              <span className="text-sm text-foreground">Streaming</span>
              <button
                onClick={() =>
                  update("aiStreamingEnabled", !settings.aiStreamingEnabled)
                }
                className={cn(
                  "ml-auto h-5 w-9 rounded-full transition-colors",
                  settings.aiStreamingEnabled
                    ? "bg-[var(--neon-lime)]/30"
                    : "bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "block h-4 w-4 rounded-full bg-foreground transition-transform",
                    settings.aiStreamingEnabled
                      ? "translate-x-4.5"
                      : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </DrawerScroll>
      <DrawerFooter href="/settings" label="进入系统设置" />
    </>
  );
}

function SettingThemeButton({
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
        "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors",
        active
          ? "border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
          : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function MiniKpi({
  label,
  value,
  unit,
  accent,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  accent: "cyan" | "lime" | "amber" | "rose" | "violet";
  icon: React.ReactNode;
}) {
  const accentColor = {
    cyan: "var(--neon-cyan)",
    lime: "var(--neon-lime)",
    amber: "var(--neon-amber)",
    rose: "var(--neon-rose)",
    violet: "var(--neon-violet)",
  }[accent];

  return (
    <div className="rounded-md border border-border/40 bg-card/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span style={{ color: accentColor }}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
        {unit && (
          <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  );
}

function PanelSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <MinusCircle className="h-6 w-6 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
