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
 *  - 此 `app/page.tsx` 为大屏，独立全屏，不走 (platform) layout。
 *  - `(platform)/` 路由组下的功能页走 ConsoleShell 统一外壳。
 */
export default function DashboardHomePage() {
  return (
    <>
      <DashboardShell />
      <AiFloatingButton />
    </>
  );
}
