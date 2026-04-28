"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type EtlStatusResponse } from "@/lib/api/client";

export const ETL_STATUS_KEY = ["etl", "status"] as const;

/**
 * ETL 状态查询：供 Dashboard 等页面获取数据新鲜度信息。
 */
export function useEtlStatus(refetchInterval = 30_000) {
  return useQuery<EtlStatusResponse>({
    queryKey: ETL_STATUS_KEY,
    queryFn: () => api.etl.status(),
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 25_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
