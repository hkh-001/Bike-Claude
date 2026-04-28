"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type DashboardTrend24h } from "@/lib/api/client";

export const DASHBOARD_TRENDS_24H_KEY = ["dashboard", "trends", "24h"] as const;

/**
 * 首页大屏 24h 趋势：60 秒轮询 `/api/dashboard/trends/24h`。
 *
 * - 与 summary（30s）/ geojson（30s）错峰，独立缓存键
 * - 趋势数据按整点桶聚合，1 分钟级刷新足以反映最新一桶
 * - 失败保留上一次成功数据（placeholderData=prev）
 */
export function useDashboardTrends24h(refetchInterval = 60_000) {
  return useQuery<DashboardTrend24h>({
    queryKey: DASHBOARD_TRENDS_24H_KEY,
    queryFn: () => api.dashboard.trends24h(),
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 50_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
