"use client";

import { useState } from "react";
import {
  Workflow,
  RefreshCw,
  Play,
  Database,
  Clock,
  AlertTriangle,
  CalendarClock,
  Activity,
  CircleCheck,
  CircleX,
  Timer,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type EtlStatusResponse,
  type FetchLogItem,
  type SchedulerStatusResponse,
} from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { etlStatusLabel, etlStatusAccent, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function EtlPage() {
  const queryClient = useQueryClient();
  const [fetchingSource, setFetchingSource] = useState<string | null>(null);

  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery<EtlStatusResponse>({
    queryKey: ["etl", "status"],
    queryFn: () => api.etl.status(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const {
    data: logs,
    isLoading: logsLoading,
  } = useQuery<FetchLogItem[]>({
    queryKey: ["etl", "logs"],
    queryFn: () => api.etl.logs({ limit: 20 }),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const {
    data: schedulerStatus,
    isLoading: schedulerLoading,
  } = useQuery<SchedulerStatusResponse>({
    queryKey: ["etl", "scheduler"],
    queryFn: () => api.etl.schedulerStatus(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const fetchMutation = useMutation({
    mutationFn: (sourceCode: string) => api.etl.fetch(sourceCode),
    onMutate: (sourceCode) => {
      setFetchingSource(sourceCode);
    },
    onSettled: () => {
      setFetchingSource(null);
      queryClient.invalidateQueries({ queryKey: ["etl", "status"] });
      queryClient.invalidateQueries({ queryKey: ["etl", "logs"] });
      queryClient.invalidateQueries({ queryKey: ["etl", "scheduler"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "etl", "health"] });
    },
  });

  const isRealDataActive =
    status?.active_source && status.active_source !== "CN-MOCK";
  const isStale = status?.data_freshness === "stale";
  const isMock = status?.data_freshness === "mock";

  return (
    <div className="flex flex-col gap-6">
      {/* Stale Warning Banner */}
      {isStale && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--neon-amber)]/30 bg-[var(--neon-amber)]/[0.06] px-4 py-2.5 text-sm text-[var(--neon-amber)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            真实数据已过期（{status?.active_source_age_seconds
              ? `${Math.round(status.active_source_age_seconds / 60)} 分钟前`
              : "未知时间"}
            ），Dashboard 仍展示最近一次真实数据，但可能不准确。
          </span>
        </div>
      )}

      {/* Mock Fallback Banner */}
      {isMock && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/[0.06] px-4 py-2.5 text-sm text-[var(--neon-cyan)]">
          <Database className="h-4 w-4 shrink-0" />
          <span>
            当前使用 Mock 兜底数据。请手动触发抓取或等待调度器自动运行以获取真实 GBFS 数据。
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-500/10 ring-1 ring-lime-500/25">
            <Workflow className="h-4.5 w-4.5 text-lime-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              ETL 管理
            </h1>
            <p className="text-xs text-muted-foreground">
              {status ? `${status.total_stations} 站点` : "加载中…"} ·
              {isRealDataActive ? (
                <span
                  className={cn(
                    "ml-1",
                    isStale
                      ? "text-[var(--neon-amber)]"
                      : "text-[var(--neon-lime)]"
                  )}
                >
                  真实数据: {status?.active_source}
                  {isStale && " (已过期)"}
                </span>
              ) : (
                <span className="ml-1 text-[var(--neon-amber)]">
                  Mock 兜底
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {schedulerStatus && (
            <Badge
              variant="outline"
              className={cn(
                "border-[var(--neon-lime)]/30 text-[var(--neon-lime)]",
                !schedulerStatus.enabled &&
                  "border-[var(--neon-rose)]/30 text-[var(--neon-rose)]"
              )}
            >
              {schedulerStatus.enabled
                ? `调度器运行中 · ${schedulerStatus.jobs.length} 任务`
                : "调度器已停止"}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "border-[var(--neon-lime)]/30 text-[var(--neon-lime)]",
              isMock && "border-[var(--neon-amber)]/30 text-[var(--neon-amber)]",
              isStale && "border-[var(--neon-amber)]/30 text-[var(--neon-amber)]"
            )}
          >
            {isMock
              ? "Mock Fallback"
              : isStale
                ? "Stale Data"
                : "Real GBFS"}
          </Badge>
        </div>
      </div>

      {/* Status Cards */}
      {statusLoading && !status ? (
        <StatusSkeleton />
      ) : statusError ? (
        <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-6 text-sm text-[var(--neon-rose)]">
          加载状态失败
        </div>
      ) : status ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={Database}
            label="总站点"
            value={String(status.total_stations)}
            sub={`真实 ${status.real_stations} / Mock ${status.mock_stations}`}
            color="var(--neon-cyan)"
          />
          <StatCard
            icon={isRealDataActive ? Database : AlertTriangle}
            label="当前数据源"
            value={isRealDataActive ? "Real GBFS" : "Mock"}
            sub={status.active_source ?? "—"}
            color={
              isRealDataActive
                ? isStale
                  ? "var(--neon-amber)"
                  : "var(--neon-lime)"
                : "var(--neon-amber)"
            }
          />
          <StatCard
            icon={Clock}
            label="数据新鲜度"
            value={
              status.data_freshness === "fresh"
                ? "新鲜"
                : status.data_freshness === "stale"
                  ? "已过期"
                  : "Mock"
            }
            sub={
              status.data_freshness_seconds !== null
                ? `${Math.round(status.data_freshness_seconds / 60)} 分钟前`
                : "从未抓取"
            }
            color={
              status.data_freshness === "fresh"
                ? "var(--neon-lime)"
                : status.data_freshness === "stale"
                  ? "var(--neon-amber)"
                  : "var(--neon-cyan)"
            }
          />
          <StatCard
            icon={Workflow}
            label="数据源"
            value={String(status.sources.length)}
            sub={`${status.sources.filter((s) => s.enabled).length} 个启用`}
            color="var(--neon-cyan)"
          />
        </div>
      ) : null}

      {/* Scheduler Status */}
      {schedulerLoading && !schedulerStatus ? (
        <SchedulerSkeleton />
      ) : schedulerStatus ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            调度器状态
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {schedulerStatus.jobs.map((job) => (
              <div
                key={job.source_code}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-card/40 px-4 py-3",
                  job.is_running
                    ? "border-[var(--neon-cyan)]/30"
                    : "border-border/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {job.source_code}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                      job.is_running
                        ? "border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)]"
                        : job.last_status === "success"
                          ? "border-[var(--neon-lime)]/30 text-[var(--neon-lime)]"
                          : job.last_status === "failed"
                            ? "border-[var(--neon-rose)]/30 text-[var(--neon-rose)]"
                            : "border-border/40 text-muted-foreground"
                    )}
                  >
                    {job.is_running ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        运行中
                      </>
                    ) : (
                      etlStatusLabel(job.last_status)
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    间隔: {job.interval_seconds ? `${Math.round(job.interval_seconds / 60)} 分钟` : "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    下次: {job.next_run_at
                      ? new Date(job.next_run_at).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>
                </div>

                {job.last_error && (
                  <span className="truncate text-[10px] text-[var(--neon-rose)]">
                    {job.last_error}
                  </span>
                )}
              </div>
            ))}
            {schedulerStatus.jobs.length === 0 && (
              <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-6 text-sm text-muted-foreground text-center">
                暂无调度任务
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Source List */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">数据源配置</h2>
        <div className="flex flex-col gap-2">
          {status?.sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {source.name}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {source.code}
                  </span>
                  {source.enabled ? (
                    <span className="rounded-full bg-lime-500/10 px-1.5 py-0.5 text-[10px] text-lime-400 ring-1 ring-lime-500/20">
                      启用
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      禁用
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground truncate">
                  {source.city ?? "—"} · {source.provider}
                  {source.last_fetch_at && (
                    <span className="ml-2 text-muted-foreground/70">
                      最近抓取:{" "}
                      {new Date(source.last_fetch_at).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !source.enabled ||
                  !!fetchingSource ||
                  fetchMutation.isPending
                }
                onClick={() => fetchMutation.mutate(source.code)}
                className="h-7 gap-1.5 text-xs border-border/40 shrink-0"
              >
                {fetchingSource === source.code ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {fetchingSource === source.code ? "抓取中…" : "手动抓取"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Fetch Logs */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">最近抓取日志</h2>
        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_100px_140px_100px_80px] gap-4 px-4 py-3 border-b border-border/40 bg-muted/20 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span>Feed</span>
            <span>来源</span>
            <span className="text-right">状态</span>
            <span className="text-right">时间</span>
            <span className="text-right">耗时</span>
            <span className="text-right">记录</span>
          </div>
          <div className="flex flex-col">
            {logsLoading && !logs && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <LogSkeletonRow key={i} />
                ))}
              </>
            )}
            {logs?.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
            {!logsLoading && (!logs || logs.length === 0) && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                暂无抓取日志
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fetch Result */}
      {fetchMutation.isSuccess && fetchMutation.data && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            fetchMutation.data.status === "success"
              ? "border-lime-500/20 bg-lime-500/[0.06] text-lime-300"
              : "border-rose-500/20 bg-rose-500/[0.06] text-rose-300"
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            {fetchMutation.data.status === "success" ? (
              <Database className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {fetchMutation.data.source_code} 抓取结果：
            {fetchMutation.data.status === "success" ? "成功" : "失败"}
          </div>
          <div className="mt-1 text-xs opacity-80">
            station_information: {fetchMutation.data.station_information_count} ·
            station_status: {fetchMutation.data.station_status_count} ·
            更新站点: {fetchMutation.data.updated_stations} ·
            快照: {fetchMutation.data.snapshot_count} ·
            耗时: {formatDuration(fetchMutation.data.duration_ms)}
          </div>
          {fetchMutation.data.error_message && (
            <div className="mt-1 text-xs text-rose-300/80">
              {fetchMutation.data.error_message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/40 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="text-lg font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground truncate">{sub}</span>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/40 px-3 py-3"
        >
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function SchedulerSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/40 px-4 py-3"
        >
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LogRow({ log }: { log: FetchLogItem }) {
  const accent = etlStatusAccent(log.status);
  const label = etlStatusLabel(log.status);

  const accentMap: Record<string, string> = {
    lime: "var(--neon-lime)",
    rose: "var(--neon-rose)",
    cyan: "var(--neon-cyan)",
    muted: "var(--muted-foreground)",
  };
  const color = accentMap[accent] ?? "var(--muted-foreground)";

  return (
    <div className="grid grid-cols-[1fr_120px_100px_140px_100px_80px] gap-4 px-4 py-3 border-b border-border/20 hover:bg-muted/10 transition-colors items-center">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="truncate text-sm font-medium text-foreground">
          {log.feed_name}
        </span>
        {log.error && (
          <span className="truncate text-[10px] text-[var(--neon-rose)]">
            {log.error}
          </span>
        )}
      </div>

      <span className="text-[11px] text-muted-foreground truncate">
        {log.source_name}
      </span>

      <span className="text-right">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
          style={{
            color,
            backgroundColor: `${color}14`,
            borderColor: `${color}33`,
          }}
        >
          {label}
        </span>
      </span>

      <span className="text-right text-[11px] text-muted-foreground font-mono tabular-nums">
        {new Date(log.started_at).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>

      <span className="text-right text-[11px] text-muted-foreground font-mono tabular-nums">
        {formatDuration(log.duration_ms)}
      </span>

      <span className="text-right font-mono text-sm tabular-nums text-muted-foreground/60">
        {log.records}
      </span>
    </div>
  );
}

function LogSkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_120px_100px_140px_100px_80px] gap-4 px-4 py-3 border-b border-border/20 items-center">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-12 justify-self-end" />
      <Skeleton className="h-3 w-20 justify-self-end" />
      <Skeleton className="h-3 w-12 justify-self-end" />
      <Skeleton className="h-4 w-6 justify-self-end" />
    </div>
  );
}
