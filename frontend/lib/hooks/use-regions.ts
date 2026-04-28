"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type RegionRankingItem } from "@/lib/api/client";

export const REGIONS_KEY = ["dashboard", "regions"] as const;

export function useRegions() {
  return useQuery<RegionRankingItem[]>({
    queryKey: REGIONS_KEY,
    queryFn: () => api.dashboard.regions(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 25_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
