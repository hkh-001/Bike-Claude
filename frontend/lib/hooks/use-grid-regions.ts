"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type GridRegionsResponse } from "@/lib/api/client";

export const GRID_REGIONS_KEY = ["dashboard", "grid-regions"] as const;

export function useGridRegions() {
  return useQuery<GridRegionsResponse>({
    queryKey: GRID_REGIONS_KEY,
    queryFn: () => api.dashboard.gridRegions(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 25_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
