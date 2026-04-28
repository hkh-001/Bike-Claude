"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type RecentAlertItem } from "@/lib/api/client";

export function alertsKey(
  level?: "info" | "warning" | "critical" | null,
  status?: string,
) {
  return ["dashboard", "alerts", level ?? "all", status ?? "open"] as const;
}

export function useAlerts(
  level?: "info" | "warning" | "critical" | null,
  status = "open",
  limit = 100,
  refetchInterval = 15_000,
) {
  return useQuery<RecentAlertItem[]>({
    queryKey: alertsKey(level, status),
    queryFn: () =>
      api.dashboard.alerts({ level, status, limit }),
    refetchInterval,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
