"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPinned,
  Bike,
  BellRing,
  LineChart,
  DatabaseZap,
  Bot,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { formatClock, formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";

const PAGE_META: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  "/": { label: "运营态势", icon: LayoutDashboard },
  "/regions": { label: "区域分析", icon: MapPinned },
  "/stations": { label: "站点管理", icon: Bike },
  "/alerts": { label: "告警中心", icon: BellRing },
  "/trends": { label: "历史趋势", icon: LineChart },
  "/etl": { label: "ETL 管理", icon: DatabaseZap },
  "/ai": { label: "AI 运营助手", icon: Bot },
  "/settings": { label: "系统设置", icon: Settings },
};

function resolvePageMeta(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // /stations/xxx → stations
  for (const key of Object.keys(PAGE_META)) {
    if (key !== "/" && pathname.startsWith(key + "/")) {
      return PAGE_META[key];
    }
  }
  return { label: "BikeOps Console", icon: LayoutDashboard };
}

/**
 * 功能页顶部轻量状态栏。
 *
 * 与首页 LiveTicker 保持同款视觉：
 * - h-11 sticky
 * - border-b border-border/50
 * - bg-background/70 backdrop-blur-md
 *
 * 内容：
 * - 左：页面图标 + 页面名称
 * - 右：当前时间 + 主题切换
 */
export function ConsoleTopBar() {
  const pathname = usePathname();
  const meta = resolvePageMeta(pathname);
  const Icon = meta.icon;

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-11 items-center gap-3 border-b border-border/50 bg-background/70 px-4 backdrop-blur-md md:px-6",
      )}
      role="banner"
    >
      {/* 页面标识 */}
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--neon-cyan)]" strokeWidth={2} />
        <span className="text-sm font-medium text-foreground">
          {meta.label}
        </span>
      </div>

      <span className="hidden h-3 w-px bg-border/60 md:block" />

      {/* 时间 */}
      <div className="hidden items-baseline gap-2 font-mono tabular-nums md:flex">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {now ? formatDate(now) : "----  --  --"}
        </span>
        <span className="text-sm font-medium text-foreground">
          {now ? formatClock(now) : "--:--:--"}
        </span>
      </div>

      {/* 右侧操作区 */}
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeModeToggle />
      </div>
    </header>
  );
}
