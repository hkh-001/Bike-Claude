"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type EtlFeedHealth } from "@/lib/api/client";

export const ETL_HEALTH_KEY = ["dashboard", "etl", "health"] as const;

export function useEtlHealth() {
  return useQuery<EtlFeedHealth[]>({
    queryKey: ETL_HEALTH_KEY,
    queryFn: () => api.dashboard.etlHealth(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 25_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
