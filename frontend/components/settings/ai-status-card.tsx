"use client";

import { useEffect, useState } from "react";
import { Bot, Zap, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiHealth {
  ok: boolean;
  key_loaded: boolean;
  model: string;
  message: string;
}

interface AiStatusCardProps {
  tokenBudget: number;
  streamingEnabled: boolean;
  onTokenBudgetChange: (value: number) => void;
  onStreamingToggle: (value: boolean) => void;
}

export function AiStatusCard({
  tokenBudget,
  streamingEnabled,
  onTokenBudgetChange,
  onStreamingToggle,
}: AiStatusCardProps) {
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: AiHealth) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled)
          setHealth({ ok: false, key_loaded: false, model: "—", message: "服务未响应" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statusColor = health?.ok
    ? "var(--neon-lime)"
    : health?.key_loaded
      ? "var(--neon-amber)"
      : "var(--neon-rose)";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">AI 助手状态</h3>
        <p className="text-xs text-muted-foreground">Kimi / Moonshot API 连接与运行参数</p>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatusItem
          icon={Bot}
          label="模型"
          value={health?.model ?? "—"}
          loading={loading}
        />
        <StatusItem
          icon={health?.ok ? CheckCircle2 : AlertTriangle}
          label="API 状态"
          value={health?.ok ? "已就绪" : "异常"}
          color={statusColor}
          loading={loading}
        />
        <StatusItem
          icon={Zap}
          label="SSE 流式"
          value={streamingEnabled ? "已启用" : "已关闭"}
          color={streamingEnabled ? "var(--neon-lime)" : "var(--neon-slate)"}
        />
        <StatusItem
          icon={Wrench}
          label="Tool-calling"
          value="已启用"
          color="var(--neon-lime)"
        />
      </div>

      {/* Token budget */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Token 预算</span>
        <div className="flex flex-wrap gap-2">
          {[4000, 6000, 8000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onTokenBudgetChange(v)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                tokenBudget === v
                  ? "border-[var(--neon-violet)]/50 bg-[var(--neon-violet)]/10 text-[var(--neon-violet)]"
                  : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
              )}
            >
              {v.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Streaming toggle */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={streamingEnabled}
          onChange={(e) => onStreamingToggle(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border/40 bg-card/40 accent-[var(--neon-cyan)]"
        />
        <span className="text-xs text-muted-foreground">启用 SSE 流式响应</span>
      </label>
    </div>
  );
}

function StatusItem({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  color?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-3 py-2">
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: color ?? "var(--neon-cyan)" }}
      />
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            loading ? "text-muted-foreground/50" : "text-foreground",
          )}
        >
          {loading ? "检测中…" : value}
        </span>
      </div>
    </div>
  );
}
