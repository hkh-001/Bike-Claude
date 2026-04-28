import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardPanelProps = {
  /** 顶部标签（小字 uppercase） */
  eyebrow?: string;
  /** 主标题 */
  title: string;
  /** 主标题左侧的图标 */
  icon?: ReactNode;
  /** 标题右侧的小卡片（一般是统计 chip） */
  meta?: ReactNode;
  /** 强调色，影响 eyebrow / 装饰条 */
  accent?: "cyan" | "violet" | "lime" | "amber" | "rose" | "muted";
  /** 主体内容 */
  children: ReactNode;
  /** 底部操作栏 */
  footer?: ReactNode;
  className?: string;
  /** 主体最小高度，用于占位 skeleton 时不抖动 */
  minBodyHeight?: number | string;
};

const accentBar: Record<NonNullable<DashboardPanelProps["accent"]>, string> = {
  cyan: "before:bg-[var(--neon-cyan)]",
  violet: "before:bg-[var(--neon-violet)]",
  lime: "before:bg-[var(--neon-lime)]",
  amber: "before:bg-[var(--neon-amber)]",
  rose: "before:bg-[var(--neon-rose)]",
  muted: "before:bg-muted-foreground/40",
};

const accentText: Record<NonNullable<DashboardPanelProps["accent"]>, string> = {
  cyan: "text-[var(--neon-cyan)]",
  violet: "text-[var(--neon-violet)]",
  lime: "text-[var(--neon-lime)]",
  amber: "text-[var(--neon-amber)]",
  rose: "text-[var(--neon-rose)]",
  muted: "text-muted-foreground",
};

export function DashboardPanel({
  eyebrow,
  title,
  icon,
  meta,
  accent = "cyan",
  children,
  footer,
  className,
  minBodyHeight,
}: DashboardPanelProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/55 bg-card/55 backdrop-blur",
        "before:absolute before:inset-y-4 before:left-0 before:w-[2px] before:rounded-full before:opacity-80",
        "transition-colors hover:border-[color-mix(in_oklch,var(--neon-cyan)_25%,var(--border))]",
        accentBar[accent],
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {eyebrow && (
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-[0.22em]",
                accentText[accent],
              )}
            >
              {eyebrow}
            </span>
          )}
          <div className="flex items-center gap-2">
            {icon && (
              <span className={cn("flex h-5 w-5 items-center justify-center", accentText[accent])}>
                {icon}
              </span>
            )}
            <h3 className="truncate text-sm font-semibold text-foreground">
              {title}
            </h3>
          </div>
        </div>
        {meta && <div className="shrink-0">{meta}</div>}
      </header>

      <CardContent
        className="flex flex-col gap-3 px-5 pb-5"
        style={minBodyHeight != null ? { minHeight: minBodyHeight } : undefined}
      >
        {children}
      </CardContent>

      {footer && (
        <footer className="border-t border-border/40 bg-card/30 px-5 py-2.5 text-[11px] text-muted-foreground">
          {footer}
        </footer>
      )}
    </Card>
  );
}
