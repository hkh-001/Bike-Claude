"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type StationGeoFeatureCollection } from "@/lib/api/client";

export const DASHBOARD_STATIONS_GEOJSON_KEY = [
  "dashboard",
  "stations",
  "geojson",
] as const;

/**
 * 首页大屏地图数据源：30 秒轮询 `/api/dashboard/stations/geojson`。
 *
 * - 与 useDashboardSummary 错开 KPI 更新节奏，独立缓存键
 * - 失败保留上一次成功数据（placeholderData=prev）
 * - 不在 SSR 取数（首次客户端 mount 后再发请求）
 */
export function useDashboardStationGeojson(refetchInterval = 30_000) {
  return useQuery<StationGeoFeatureCollection>({
    queryKey: DASHBOARD_STATIONS_GEOJSON_KEY,
    queryFn: () => api.dashboard.stationsGeojson(),
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 25_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
