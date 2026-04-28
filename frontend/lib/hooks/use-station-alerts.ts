"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type StationAlertsResponse } from "@/lib/api/client";

export function stationAlertsKey(code: string) {
  return ["station", "alerts", code] as const;
}

export function useStationAlerts(code: string, limit = 20) {
  return useQuery<StationAlertsResponse>({
    queryKey: [...stationAlertsKey(code), limit],
    queryFn: () => api.dashboard.stationAlerts(code, limit),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
