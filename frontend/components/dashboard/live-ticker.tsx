"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Cpu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { formatClock, formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";

type LiveTickerProps = {
  /** 数据是否正在轮询/获取 */
  isFetching?: boolean;
  /** 数据来源（用于右侧显示） */
  source?: string;
  /** 整条 ticker 的额外 className */
  className?: string;
};

/**
 * 顶部薄条：LIVE 呼吸点 + 浏览器本地时间 + 数据源 + 跳转功能页 + 主题切换。
 *
 * 动效约束：仅 LIVE 呼吸 + isFetching 状态时数据点变色，没有其他持续动画。
 */
export function LiveTicker({
  isFetching = false,
  source = "FastAPI · /api/dashboard/summary · 30s polling",
  className,
}: LiveTickerProps) {
  const [now, setNow] = useState<Date | null>(null);

  // 仅客户端 mount 后才显示时间，避免 SSR 时区不一致 hydration 警告
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-11 items-center gap-3 border-b border-border/50 bg-background/70 px-4 backdrop-blur-md md:px-6",
        className,
      )}
      role="banner"
    >
      {/* LIVE 指示器 */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[var(--neon-cyan)]"
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.6, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ filter: "blur(1.5px)" }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--neon-cyan)]" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--neon-cyan)]">
          Live
        </span>
      </div>

      <span className="hidden h-3 w-px bg-border/60 md:block" />

      {/* 时间 */}
      <div className="flex items-baseline gap-2 font-mono tabular-nums">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {now ? formatDate(now) : "----  --  --"}
        </span>
        <span className="text-sm font-medium text-foreground md:text-base">
          {now ? formatClock(now) : "--:--:--"}
        </span>
      </div>

      {/* 中间标题（仅 lg+ 显示） */}
      <div className="ml-auto hidden items-center gap-2 lg:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Operations Console
        </span>
        <span className="hidden h-3 w-px bg-border/60 lg:block" />
        <span className="hidden text-[11px] text-muted-foreground/85 lg:inline">
          {source}
        </span>
        <span
          className={cn(
            "ml-1 hidden h-1.5 w-1.5 rounded-full lg:inline-block",
            isFetching
              ? "bg-[var(--neon-amber)] shadow-[0_0_6px_var(--neon-amber)]"
              : "bg-[var(--neon-lime)]",
          )}
          title={isFetching ? "刷新中" : "已就绪"}
        />
      </div>

      {/* 操作区 */}
      <div className="ml-auto flex items-center gap-1.5 lg:ml-3">
        <Button
          render={<Link href="/regions" />}
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-[var(--neon-cyan)]"
        >
          <Cpu className="h-3.5 w-3.5" />
          功能控制台
          <ArrowUpRight className="h-3 w-3" />
        </Button>
        <ThemeModeToggle />
      </div>
    </header>
  );
}
