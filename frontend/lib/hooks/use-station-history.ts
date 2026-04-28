"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type StationHistoryResponse } from "@/lib/api/client";

export function stationHistoryKey(code: string) {
  return ["station", "history", code] as const;
}

export function useStationHistory(code: string, hours = 24) {
  return useQuery<StationHistoryResponse>({
    queryKey: [...stationHistoryKey(code), hours],
    queryFn: () => api.dashboard.stationHistory(code, hours),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 55_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
