import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  trend?: number | null;
  trendLabel?: string;
  accent?: "cyan" | "violet" | "lime" | "amber" | "rose" | "muted";
  icon?: ReactNode;
  className?: string;
};

const accentRing: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  cyan: "before:bg-[var(--neon-cyan)]",
  violet: "before:bg-[var(--neon-violet)]",
  lime: "before:bg-[var(--neon-lime)]",
  amber: "before:bg-[var(--neon-amber)]",
  rose: "before:bg-[var(--neon-rose)]",
  muted: "before:bg-muted-foreground/40",
};

const accentText: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  cyan: "text-[var(--neon-cyan)]",
  violet: "text-[var(--neon-violet)]",
  lime: "text-[var(--neon-lime)]",
  amber: "text-[var(--neon-amber)]",
  rose: "text-[var(--neon-rose)]",
  muted: "text-muted-foreground",
};

export function MetricCard({
  label,
  value,
  unit,
  hint,
  trend,
  trendLabel,
  accent = "cyan",
  icon,
  className,
}: MetricCardProps) {
  const trendIcon =
    trend == null ? (
      <Minus className="h-3 w-3" />
    ) : trend >= 0 ? (
      <ArrowUpRight className="h-3 w-3" />
    ) : (
      <ArrowDownRight className="h-3 w-3" />
    );

  const trendColor =
    trend == null
      ? "text-muted-foreground"
      : trend >= 0
        ? "text-[var(--neon-lime)]"
        : "text-[var(--neon-rose)]";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/50 bg-card/60 backdrop-blur transition-colors",
        "before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:opacity-80",
        accentRing[accent],
        className,
      )}
    >
      <CardContent className="flex flex-col gap-3 py-5 pl-6 pr-5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{label}</span>
          {icon && <span className={accentText[accent]}>{icon}</span>}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-mono text-3xl font-semibold tabular-nums tracking-tight md:text-4xl",
              accentText[accent],
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-muted-foreground">{unit}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{hint}</span>
          {(trend != null || trendLabel) && (
            <span className={cn("flex items-center gap-1 font-medium", trendColor)}>
              {trendIcon}
              {trend != null && (
                <span className="tabular-nums">
                  {trend > 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
              )}
              {trendLabel && (
                <span className="text-muted-foreground">· {trendLabel}</span>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
