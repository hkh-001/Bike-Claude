"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type StationDetail } from "@/lib/api/client";

export function stationDetailKey(code: string) {
  return ["station", "detail", code] as const;
}

export function useStationDetail(code: string) {
  return useQuery<StationDetail>({
    queryKey: stationDetailKey(code),
    queryFn: () => api.dashboard.stationDetail(code),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
