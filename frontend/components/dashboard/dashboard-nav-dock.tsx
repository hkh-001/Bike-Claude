"use client";

import Link from "next/link";
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
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "运营态势" },
  { href: "/regions", icon: MapPinned, label: "区域分析" },
  { href: "/stations", icon: Bike, label: "站点管理" },
  { href: "/alerts", icon: BellRing, label: "告警中心" },
  { href: "/trends", icon: LineChart, label: "历史趋势" },
  { href: "/etl", icon: DatabaseZap, label: "ETL 管理" },
  { href: "/ai", icon: Bot, label: "AI 助手" },
  { href: "/settings", icon: Settings, label: "系统设置" },
];

/**
 * 左侧轻量展开式导航栏（图标 + 文字）。
 *
 * - 宽度 168px，暗色玻璃拟态
 * - 固定左侧，垂直居中
 * - 当前页高亮（cyan glow + 左侧竖线）
 * - hover 轻微背景变化
 * - 仅 md+ 显示
 */
export function DashboardNavDock() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-0.5",
        "rounded-3xl border border-white/[0.08] bg-[#0c1020]/82 backdrop-blur-xl",
        "py-2.5 px-2 shadow-xl shadow-black/25",
        "md:flex",
        "w-[168px]",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "group relative flex h-10 items-center gap-2.5 rounded-xl px-2.5",
              "transition-all duration-200",
              isActive
                ? [
                    "bg-[var(--neon-cyan)]/[0.08] text-[var(--neon-cyan)]",
                    "shadow-[0_0_12px_rgba(92,210,230,0.18)]",
                    "ring-1 ring-[var(--neon-cyan)]/15",
                  ]
                : [
                    "text-slate-400 hover:bg-white/[0.04] hover:text-[var(--neon-cyan)]",
                  ],
            )}
          >
            {/* 活跃指示器 — 左侧竖线 */}
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_6px_var(--neon-cyan)]" />
            )}

            <Icon
              className={cn(
                "h-[17px] w-[17px] shrink-0 transition-colors",
                isActive ? "text-[var(--neon-cyan)]" : "text-slate-400 group-hover:text-[var(--neon-cyan)]",
              )}
              strokeWidth={2}
            />
            <span
              className={cn(
                "truncate text-[13px] font-medium leading-none transition-colors",
                isActive ? "text-[var(--neon-cyan)]" : "text-slate-400 group-hover:text-[var(--neon-cyan)]",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
