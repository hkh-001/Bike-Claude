"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EtlFeedHealth {
  feed_id: number;
  feed_name: string;
  source_name: string;
  last_status: string | null;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_error_count: number | null;
}

export function DataSourceStatusCard() {
  const [feeds, setFeeds] = useState<EtlFeedHealth[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/etl/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: EtlFeedHealth[]) => {
        if (!cancelled) setFeeds(data);
      })
      .catch(() => {
        if (!cancelled) setFeeds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = feeds?.length ?? 0;
  const success = feeds?.filter((f) => f.last_status === "success").length ?? 0;
  const failed = feeds?.filter((f) => f.last_status === "failed").length ?? 0;
  const lastUpdate = feeds?.[0]?.last_finished_at
    ? new Date(feeds[0].last_finished_at).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">数据源状态</h3>
        <p className="text-xs text-muted-foreground">ETL 同步 feed 健康概览</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox
          icon={Database}
          label="Feed 总数"
          value={loading ? "—" : String(total)}
          color="var(--neon-cyan)"
        />
        <StatBox
          icon={CheckCircle2}
          label="正常"
          value={loading ? "—" : String(success)}
          color="var(--neon-lime)"
        />
        <StatBox
          icon={AlertTriangle}
          label="异常"
          value={loading ? "—" : String(failed)}
          color={failed > 0 ? "var(--neon-rose)" : "var(--neon-slate)"}
        />
      </div>

      {lastUpdate && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          最近同步：{lastUpdate}
        </div>
      )}

      {/* Feed list */}
      {!loading && feeds && feeds.length > 0 && (
        <div className="flex flex-col gap-1">
          {feeds.slice(0, 4).map((f) => (
            <div
              key={f.feed_id}
              className="flex items-center justify-between rounded-md border border-border/30 bg-card/30 px-3 py-1.5"
            >
              <span className="truncate text-[11px] text-foreground">
                {f.feed_name}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  f.last_status === "success"
                    ? "bg-lime-500/10 text-lime-400"
                    : f.last_status === "failed"
                      ? "bg-rose-500/10 text-rose-400"
                      : "bg-amber-500/10 text-amber-400",
                )}
              >
                {f.last_status ?? "未知"}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && (!feeds || feeds.length === 0) && (
        <div className="rounded-md border border-border/30 bg-card/30 px-3 py-2 text-[11px] text-muted-foreground">
          暂无数据源状态信息
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-border/40 bg-card/40 px-2 py-2">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
