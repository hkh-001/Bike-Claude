/**
 * 后端 API 客户端：基于原生 fetch 的薄封装。
 *
 * - dev：next.config 已将 `/api/*` 反向代理到 `http://localhost:8000/api/*`，
 *   组件直接用相对路径调用即可，避免 CORS 设置。
 * - 浏览器与服务器组件（RSC）均可使用本工具：
 *   - 浏览器：相对路径自动拼到当前 origin。
 *   - 服务器：必须给出绝对地址，从 `NEXT_PUBLIC_API_BASE` 或
 *     `INTERNAL_API_BASE` 读取。
 */

const isServer = typeof window === "undefined";

function resolveBaseUrl(): string {
  const fromEnv =
    process.env.INTERNAL_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? "";
  if (isServer) {
    if (!fromEnv) {
      throw new ApiError(
        "Missing API base URL. Set NEXT_PUBLIC_API_BASE or INTERNAL_API_BASE.",
      );
    }
    return fromEnv.replace(/\/$/, "");
  }
  return fromEnv ? fromEnv.replace(/\/$/, "") : "";
}

function buildUrl(path: string): string {
  const base = resolveBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export class ApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type RequestOptions = RequestInit & {
  /** 自定义查询参数，会被 URLSearchParams 序列化。值为 null/undefined 会被忽略。 */
  query?: Record<string, string | number | boolean | null | undefined>;
};

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { query, headers, ...rest } = options;

  let finalPath = path;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined) continue;
      params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) finalPath += (path.includes("?") ? "&" : "?") + qs;
  }

  const res = await fetch(buildUrl(finalPath), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    cache: rest.cache ?? "no-store",
  });

  const text = await res.text();
  const body = text ? safeParseJson(text) : undefined;

  if (!res.ok) {
    throw new ApiError(
      typeof body === "object" && body && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : `请求失败：${res.status}`,
      res.status,
      body,
    );
  }
  return body as T;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  health: () => request<{ ok: boolean; version: string }>("/api/health"),
  dashboard: {
    summary: () => request<DashboardSummary>("/api/dashboard/summary"),
    kpi: () => request<DashboardKPI>("/api/dashboard/kpi"),
    risks: () => request<RisksResponse>("/api/dashboard/risks"),
    stationsGeojson: () =>
      request<StationGeoFeatureCollection>("/api/dashboard/stations/geojson"),
    trends24h: () => request<DashboardTrend24h>("/api/dashboard/trends/24h"),
    regions: () => request<RegionRankingItem[]>("/api/dashboard/regions"),
    gridRegions: () => request<GridRegionsResponse>("/api/dashboard/regions/grid"),
    stations: (query?: { risk_type?: StationRiskType | null }) =>
      request<RiskStationItem[]>("/api/dashboard/stations", { query }),
    alerts: (query?: {
      level?: "info" | "warning" | "critical" | null;
      status?: string;
      limit?: number;
      mode?: "real" | "mock";
    }) => request<RecentAlertItem[]>("/api/dashboard/alerts", { query }),
    etlHealth: () => request<EtlFeedHealth[]>("/api/dashboard/etl/health"),
    stationDetail: (code: string) =>
      request<StationDetail>(`/api/dashboard/stations/${encodeURIComponent(code)}`),
    stationHistory: (code: string, hours = 24) =>
      request<StationHistoryResponse>(
        `/api/dashboard/stations/${encodeURIComponent(code)}/history`,
        { query: { hours } },
      ),
    stationAlerts: (code: string, limit = 20) =>
      request<StationAlertsResponse>(
        `/api/dashboard/stations/${encodeURIComponent(code)}/alerts`,
        { query: { limit } },
      ),
  },
  etl: {
    fetch: (sourceCode: string) =>
      request<FetchResponse>("/api/etl/fetch", {
        method: "POST",
        body: JSON.stringify({ source_code: sourceCode }),
      }),
    sources: () => request<DataSourceItem[]>("/api/etl/sources"),
    logs: (query?: { source_code?: string; limit?: number }) =>
      request<FetchLogItem[]>("/api/etl/logs", { query }),
    status: () => request<EtlStatusResponse>("/api/etl/status"),
    schedulerStatus: () => request<SchedulerStatusResponse>("/api/etl/scheduler/status"),
  },
};

export type DashboardKPI = {
  total_stations: number;
  active_stations: number;
  total_bikes_available: number;
  total_docks_available: number;
  avg_occupancy_rate: number;
  alerts: { info: number; warning: number; critical: number };
  /** 系统最近一次成功 ETL 抓取时间（推荐用于"最近抓取"展示） */
  system_updated_at: string | null;
  /** GBFS 官方最近上报时间 */
  source_reported_at: string | null;
  /** 兼容字段，同 system_updated_at */
  last_updated: string | null;
};

export type RegionRankingItem = {
  region_id: number;
  code: string;
  name: string;
  city: string;
  station_count: number;
  bikes_total: number;
  avg_occupancy: number;
  open_alerts: number;
};

export type GridRegionItem = {
  grid_code: string;
  label: string;
  station_count: number;
  available_bikes: number;
  avg_occupancy_rate: number;
  capacity: number;
  alert_count: number;
};

export type GridRegionsResponse = {
  items: GridRegionItem[];
};

export type StationRiskType =
  | "normal"
  | "empty"
  | "full"
  | "offline"
  | "abnormal";

export type RiskStationItem = {
  station_id: number;
  code: string;
  name: string;
  region_code: string | null;
  region_name: string | null;
  lat: number;
  lng: number;
  capacity: number;
  bikes_available: number;
  docks_available: number;
  occupancy_rate: number;
  risk_type: StationRiskType;
};

export type RecentAlertItem = {
  id: number;
  level: "info" | "warning" | "critical";
  type: string;
  title: string;
  message: string;
  status: string;
  station_code: string | null;
  station_name: string | null;
  region_code: string | null;
  region_name: string | null;
  created_at: string;
};

export type EtlFeedHealth = {
  feed_id: number;
  feed_name: string;
  source_name: string;
  last_status: string | null;
  last_started_at: string | null;
  last_duration_ms: number | null;
  last_error: string | null;
  recent_failures: number;
};

export type OperationalAreaRankingItem = {
  area_id: string;
  area_name: string;
  center_lat: number;
  center_lon: number;
  station_count: number;
  bikes_total: number;
  docks_total: number;
  capacity_total: number;
  avg_occupancy: number;
};

export type DashboardSummary = {
  kpi: DashboardKPI;
  region_ranking: RegionRankingItem[];
  operational_area_ranking: OperationalAreaRankingItem[];
  risk_stations: RiskStationItem[];
  recent_alerts: RecentAlertItem[];
  etl_health: EtlFeedHealth[];
};

export type RisksResponse = {
  empty_risks: RiskStationItem[];
  full_risks: RiskStationItem[];
};

// ---------------------------------------------------------------------------
// GeoJSON: 站点散点图（M2.2-A）
// ---------------------------------------------------------------------------

export type StationGeoProperties = {
  station_id: number;
  station_code: string;
  name: string;
  region_name: string | null;
  capacity: number;
  bikes_available: number;
  docks_available: number;
  occupancy_rate: number;
  risk_type: StationRiskType;
  status: string;
  updated_at: string | null;
};

export type StationGeoFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: StationGeoProperties;
};

export type StationGeoFeatureCollection = {
  type: "FeatureCollection";
  features: StationGeoFeature[];
};

// ---------------------------------------------------------------------------
// 24h 趋势（M2.2-B）
// ---------------------------------------------------------------------------

/** 单个整点桶的城市层面聚合 */
export type TrendBucket = {
  /** ISO 时间（向下对齐到整点，UTC naive） */
  ts: string;
  /** 桶内全部站点 SUM(bikes) */
  city_total_bikes: number;
  /** 桶内全部站点 AVG(occupancy_rate)，范围 0~1 */
  city_avg_occupancy: number;
  /** 桶内 alert.created_at 命中条数 */
  alerts_count: number;
};

/** Top-N 区域单桶点 */
export type TrendRegionPoint = {
  ts: string;
  bikes_available: number;
  /** 0~1 */
  avg_occupancy: number;
};

/** Top-N 单个区域的整段时序 */
export type TrendRegionSeries = {
  region_code: string;
  region_name: string;
  points: TrendRegionPoint[];
};

/** GET /api/dashboard/trends/24h 响应体 */
export type DashboardTrend24h = {
  range: "24h";
  interval: "1h";
  buckets: TrendBucket[];
  region_series: TrendRegionSeries[];
};

// ---------------------------------------------------------------------------
// M5.1: 单站详情
// ---------------------------------------------------------------------------

export type StationDetail = {
  station_id: number;
  station_code: string;
  name: string;
  region_code: string | null;
  region_name: string | null;
  lat: number;
  lng: number;
  capacity: number;
  status: string;
  bikes_available: number;
  docks_available: number;
  occupancy_rate: number;
  risk_type: StationRiskType;
  updated_at: string | null;
};

export type StationHistoryPoint = {
  ts: string;
  bikes_available: number;
  docks_available: number;
  occupancy_rate: number;
};

export type StationHistoryResponse = {
  station_code: string;
  range: "24h";
  interval: "1h";
  points: StationHistoryPoint[];
};

export type StationAlertItem = {
  id: number;
  level: string;
  type: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
};

export type StationAlertsResponse = {
  station_code: string;
  items: StationAlertItem[];
};

// ---------------------------------------------------------------------------
// ETL (M7)
// ---------------------------------------------------------------------------

export type FetchResponse = {
  source_code: string;
  station_information_count: number;
  station_status_count: number;
  updated_stations: number;
  snapshot_count: number;
  status: string;
  duration_ms: number;
  error_message?: string;
};

export type DataSourceItem = {
  id: number;
  code: string;
  name: string;
  provider: string;
  city: string | null;
  gbfs_url: string | null;
  enabled: boolean;
  last_fetch_at: string | null;
};

export type FetchLogItem = {
  id: number;
  feed_name: string;
  source_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records: number;
  duration_ms: number;
  error: string | null;
};

export type EtlStatusResponse = {
  active_source: string | null;
  data_freshness: "fresh" | "stale" | "mock";
  active_source_is_fresh: boolean;
  active_source_age_seconds: number | null;
  total_stations: number;
  real_stations: number;
  mock_stations: number;
  last_success_fetch_at: string | null;
  last_failure_at: string | null;
  data_freshness_seconds: number | null;
  scheduler_enabled: boolean;
  scheduler_running: boolean;
  sources: DataSourceItem[];
};

export type SchedulerJobItem = {
  source_code: string;
  interval_seconds: number | null;
  is_running: boolean;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_status: string | null;
  next_run_at: string | null;
  last_error: string | null;
};

export type SchedulerStatusResponse = {
  enabled: boolean;
  jobs: SchedulerJobItem[];
};
