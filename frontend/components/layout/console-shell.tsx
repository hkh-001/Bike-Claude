"use client";

import type { ReactNode } from "react";
import { DashboardNavDock } from "@/components/dashboard/dashboard-nav-dock";
import { ConsoleTopBar } from "./console-top-bar";

/**
 * 统一 Console Shell：所有功能页共用此外壳。
 *
 * - 左侧轻量 DashboardNavDock
 * - 顶部 ConsoleTopBar（页面名称 + 时间 + 主题切换）
 * - 暗色科技背景
 * - 统一左侧 padding（md:pl-20 给 Dock 留空）
 * - 主体内容最大宽度 1680px 居中
 */
export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardNavDock />
      <ConsoleTopBar />
      <main className="flex-1 px-4 py-4 md:pl-52 md:pr-6 md:py-5">
        <div className="mx-auto w-full max-w-[1680px]">{children}</div>
      </main>
    </div>
  );
}
