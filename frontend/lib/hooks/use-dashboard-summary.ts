"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type DashboardSummary } from "@/lib/api/client";

export const DASHBOARD_SUMMARY_KEY = ["dashboard", "summary"] as const;

/**
 * 首页大屏唯一数据源：30 秒轮询 `/api/dashboard/summary`。
 *
 * - 失败时保留上一次成功数据（placeholderData=keepPreviousData 行为通过 keepPreviousData 5.x 写法实现）
 * - 网络恢复 / 窗口聚焦自动重连
 * - 不在 SSR 取数（首次客户端 mount 后再发请求）
 */
export function useDashboardSummary(refetchInterval = 30_000) {
  return useQuery<DashboardSummary>({
    queryKey: DASHBOARD_SUMMARY_KEY,
    queryFn: () => api.dashboard.summary(),
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 25_000,
    retry: 1,
    // v5 中 keepPreviousData 由 placeholderData: keepPreviousData 替代
    placeholderData: (prev) => prev,
  });
}
