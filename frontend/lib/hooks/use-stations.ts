"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type RiskStationItem, type StationRiskType } from "@/lib/api/client";

export function stationsKey(riskType?: StationRiskType | null) {
  return ["dashboard", "stations", riskType ?? "all"] as const;
}

export function useStations(riskType?: StationRiskType | null) {
  return useQuery<RiskStationItem[]>({
    queryKey: stationsKey(riskType),
    queryFn: () => api.dashboard.stations({ risk_type: riskType }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 25_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
