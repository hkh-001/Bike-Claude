import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AiFloatingButton } from "@/components/ai";

export const metadata: Metadata = {
  title: "运营态势大屏",
};

/**
 * 首页 = 城市运营监控大屏。
 *
 * 路由结构：
 *  - 此 `app/page.tsx` 为大屏，独立全屏，不走 (platform) layout，没有 AppShell sidebar。
 *  - `(platform)/` 路由组下的功能页（regions/stations/alerts/trends/etl/ai/settings）走 AppShell。
 *  - LiveTicker 右侧「功能控制台 →」按钮跳转到功能页。
 */
export default function DashboardHomePage() {
  return (
    <>
      <DashboardShell />
      <AiFloatingButton />
    </>
  );
}
