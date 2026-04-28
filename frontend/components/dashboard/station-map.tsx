"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MaplibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle, MapPin, RefreshCw } from "lucide-react";

import { useDashboardStationGeojson } from "@/lib/hooks/use-dashboard-station-geojson";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { MapLegend } from "@/components/dashboard/map-legend";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatOccupancy } from "@/lib/format";
import { formatRelative } from "@/lib/time";
import type {
  StationGeoFeature,
  StationGeoFeatureCollection,
  StationRiskType,
} from "@/lib/api/client";

/**
 * 站点散点图（M2.2-A）。
 *
 * - 数据：30s 轮询 `/api/dashboard/stations/geojson`（FeatureCollection）
 * - 底图：Carto Dark Matter raster（无 token，免费）
 * - 圈点：颜色 = risk_type，半径 = capacity（10→4px, 50→10px）
 * - 交互：click → popup，hover → 鼠标变 pointer
 * - 三态：首次 skeleton / 首次失败 ErrorBlock + retry / 后续失败保留旧数据
 * - 降级：底图 tile load 失败 → 显示离线提示，圈点仍按相对坐标渲染（保留站点位置感知）
 */
export function StationMap({
  className,
  refetchInterval,
}: {
  className?: string;
  refetchInterval?: number;
}) {
  const { data, error, isLoading, isFetching, refetch } =
    useDashboardStationGeojson(refetchInterval);

  return (
    <DashboardPanel
      eyebrow="GEO MAP"
      title="城市站点空间分布"
      icon={<MapPin className="h-4 w-4" />}
      accent="cyan"
      meta={<MapMetaChip data={data} isFetching={isFetching} />}
      className={className}
    >
      <div className="relative h-[460px] w-full overflow-hidden rounded-md border border-border/40 bg-[#0a0d18] xl:h-[520px]">
        {isLoading && !data && <MapSkeleton />}
        {error && !data && (
          <ErrorBlock onRetry={() => refetch()} message={(error as Error).message} />
        )}
        {data && <MapCanvas data={data} />}
        {data && (
          <MapLegend className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[220px] text-foreground" />
        )}
      </div>
    </DashboardPanel>
  );
}

// ---------------------------------------------------------------------------
// 颜色 / 尺寸映射 — 与 map-legend.tsx 保持一致
// ---------------------------------------------------------------------------

const RISK_COLOR: Record<StationRiskType, string> = {
  normal: "#5cd2e6", // neon-cyan oklch(0.78 0.16 195)
  empty: "#f4b94a", // neon-amber
  full: "#a87bf0", // neon-violet
  abnormal: "#ec6d72", // neon-rose
  offline: "#6b7280", // gray-500
};

const RISK_LABEL: Record<StationRiskType, string> = {
  normal: "正常",
  empty: "空车风险",
  full: "满桩风险",
  abnormal: "异常",
  offline: "离线",
};

// ---------------------------------------------------------------------------
// 实际 MapLibre 渲染层
// ---------------------------------------------------------------------------

function MapCanvas({ data }: { data: StationGeoFeatureCollection }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const fittedRef = useRef(false);
  const dataRef = useRef(data);
  const [tileError, setTileError] = useState(false);
  const [debug, setDebug] = useState<MapDebugState>(initialDebug);

  // 始终保持 dataRef 最新，便于 map.on("load") 等延迟回调读取
  useEffect(() => {
    dataRef.current = data;
    setDebug((d) => ({ ...d, featuresLen: data.features.length }));
  }, [data]);

  // ---- 初始化地图（仅一次）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initRect = container.getBoundingClientRect();
    if (process.env.NODE_ENV === "development") {
      console.log("[StationMap Debug] features", dataRef.current.features.length);
      console.log("[StationMap Debug] container", initRect);
    }
    setDebug((d) => ({
      ...d,
      featuresLen: dataRef.current.features.length,
      containerW: Math.round(initRect.width),
      containerH: Math.round(initRect.height),
    }));

    const map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          // 兜底背景层：tile 失败时也保证暗底，而不是透明 canvas
          {
            id: "bg",
            type: "background",
            paint: { "background-color": "#0a0d18" },
          },
          {
            id: "basemap-tiles",
            type: "raster",
            source: "basemap",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [105, 35],
      zoom: 1.6,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    // tile / 网络错误：标记 + 切换到 OSM raster fallback（即使 carto 失败仍有底图）
    let tileFallbackUsed = false;
    map.on("error", (ev) => {
      const errMsg = (ev as { error?: Error })?.error?.message ?? String(ev);
      if (process.env.NODE_ENV === "development") {
        console.warn("[StationMap Debug] error", errMsg);
      }
      setTileError(true);
      setDebug((d) => ({ ...d, lastError: errMsg.slice(0, 140) }));
      if (!tileFallbackUsed) {
        tileFallbackUsed = true;
        const src = map.getSource("basemap") as
          | (maplibregl.RasterTileSource & { setTiles?: (urls: string[]) => void })
          | undefined;
        if (src && typeof src.setTiles === "function") {
          src.setTiles(["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]);
        }
      }
    });

    // 幂等地添加 source / layer 并 setData → fitBounds
    const ensureSourceAndLayers = () => {
      if (!map.getSource("stations")) {
        map.addSource("stations", {
          type: "geojson",
          data: dataRef.current,
        });
      }

      if (!map.getLayer("stations-glow")) {
        map.addLayer({
          id: "stations-glow",
          type: "circle",
          source: "stations",
          filter: [
            "in",
            ["get", "risk_type"],
            ["literal", ["empty", "full", "abnormal"]],
          ],
          paint: {
            "circle-color": [
              "match",
              ["get", "risk_type"],
              "empty",
              RISK_COLOR.empty,
              "full",
              RISK_COLOR.full,
              "abnormal",
              RISK_COLOR.abnormal,
              /* default */ RISK_COLOR.normal,
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "capacity"],
              5,
              10,
              20,
              16,
              40,
              22,
              60,
              28,
            ],
            "circle-blur": 0.85,
            "circle-opacity": 0.45,
          },
        });
      }

      if (!map.getLayer("stations-circle")) {
        map.addLayer({
          id: "stations-circle",
          type: "circle",
          source: "stations",
          paint: {
            "circle-color": [
              "match",
              ["get", "risk_type"],
              "normal",
              RISK_COLOR.normal,
              "empty",
              RISK_COLOR.empty,
              "full",
              RISK_COLOR.full,
              "abnormal",
              RISK_COLOR.abnormal,
              "offline",
              RISK_COLOR.offline,
              /* default */ RISK_COLOR.normal,
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "capacity"],
              5,
              5,
              20,
              8,
              40,
              11,
              60,
              14,
            ],
            "circle-stroke-width": 1.2,
            "circle-stroke-color": "#0b0e1a",
            "circle-opacity": 0.95,
            "circle-stroke-opacity": 0.85,
          },
        });
      }

      // 硬编码红色测试点（验证图层渲染管线）— 北京天安门附近
      if (!map.getSource("debug-pin")) {
        map.addSource("debug-pin", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [116.4, 39.9] },
                properties: { kind: "debug" },
              },
            ],
          },
        });
        map.addLayer({
          id: "debug-pin-layer",
          type: "circle",
          source: "debug-pin",
          paint: {
            "circle-color": "#ff3344",
            "circle-radius": 12,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 1,
          },
        });
      }

      // 数据 + fitBounds（首次）
      const src = map.getSource("stations") as GeoJSONSource | undefined;
      if (src) src.setData(dataRef.current);

      if (!fittedRef.current && dataRef.current.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const f of dataRef.current.features) {
          bounds.extend(f.geometry.coordinates as [number, number]);
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 60, left: 60, right: 40 },
            duration: 600,
            maxZoom: 5,
          });
          fittedRef.current = true;
        }
      }

      const sourceExists = !!map.getSource("stations");
      const layerExists = !!map.getLayer("stations-circle");
      if (process.env.NODE_ENV === "development") {
        console.log("[StationMap Debug] source", sourceExists, "layer", layerExists);
        console.log("[StationMap Debug] layers", map.getStyle().layers?.map((l) => l.id));
      }
      setDebug((d) => ({ ...d, sourceExists, layerExists }));
    };

    map.on("load", () => {
      const canvas = map.getCanvas();
      const cRect = canvas?.getBoundingClientRect();
      const cnt = containerRef.current?.getBoundingClientRect();
      if (process.env.NODE_ENV === "development") {
        console.log("[StationMap Debug] map loaded; loaded()=", map.loaded(), "styleLoaded=", map.isStyleLoaded());
        console.log("[StationMap Debug] canvas", cRect);
        console.log("[StationMap Debug] center", map.getCenter(), "zoom", map.getZoom());
      }
      setDebug((d) => ({
        ...d,
        mapLoaded: true,
        canvasW: cRect ? Math.round(cRect.width) : 0,
        canvasH: cRect ? Math.round(cRect.height) : 0,
        containerW: cnt ? Math.round(cnt.width) : d.containerW,
        containerH: cnt ? Math.round(cnt.height) : d.containerH,
        hasCanvas: !!canvas,
        hasGl: !!(canvas && (canvas as HTMLCanvasElement).getContext),
        zoom: Number(map.getZoom().toFixed(2)),
        center: [
          Number(map.getCenter().lng.toFixed(3)),
          Number(map.getCenter().lat.toFixed(3)),
        ],
      }));

      ensureSourceAndLayers();

      map.on("mouseenter", "stations-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stations-circle", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "stations-circle", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const props = feat.properties as unknown as StationGeoFeature["properties"];
        const [lng, lat] = (
          feat.geometry as unknown as { coordinates: [number, number] }
        ).coordinates;
        new maplibregl.Popup({
          offset: 14,
          closeButton: true,
          maxWidth: "280px",
        })
          .setLngLat([lng, lat])
          .setHTML(buildPopupHtml(props))
          .addTo(map);
      });

      // moveend → 更新 zoom/center 调试值
      map.on("moveend", () => {
        setDebug((d) => ({
          ...d,
          zoom: Number(map.getZoom().toFixed(2)),
          center: [
            Number(map.getCenter().lng.toFixed(3)),
            Number(map.getCenter().lat.toFixed(3)),
          ],
        }));
      });
    });

    // 首次 paint 后强制 resize（修「mount 时容器 0 尺寸」）
    const raf = requestAnimationFrame(() => {
      try {
        map.resize();
        const c = map.getCanvas();
        const cRect = c?.getBoundingClientRect();
        const cnt = container.getBoundingClientRect();
        if (process.env.NODE_ENV === "development") {
          console.log("[StationMap Debug] post-rAF resize; container", cnt, "canvas", cRect);
        }
        setDebug((d) => ({
          ...d,
          containerW: Math.round(cnt.width),
          containerH: Math.round(cnt.height),
          canvasW: cRect ? Math.round(cRect.width) : d.canvasW,
          canvasH: cRect ? Math.round(cRect.height) : d.canvasH,
          hasCanvas: !!c,
        }));
      } catch {
        /* map 可能已 remove */
      }
    });

    // 容器尺寸变化时 → resize（响应式 / sidebar 收缩 / 窗口 resize）
    const ro = new ResizeObserver(() => {
      const m = mapRef.current;
      if (!m) return;
      try {
        m.resize();
        const c = m.getCanvas();
        const cRect = c?.getBoundingClientRect();
        const cnt = container.getBoundingClientRect();
        setDebug((d) => ({
          ...d,
          containerW: Math.round(cnt.width),
          containerH: Math.round(cnt.height),
          canvasW: cRect ? Math.round(cRect.width) : d.canvasW,
          canvasH: cRect ? Math.round(cRect.height) : d.canvasH,
        }));
      } catch {
        /* noop */
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- data 更新（轮询新数据时同步到 source）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      const src = map.getSource("stations") as GeoJSONSource | undefined;
      if (src) src.setData(data);
    }
  }, [data]);

  return (
    <>
      <div
        ref={containerRef}
        className="h-full w-full [&_.maplibregl-canvas]:!outline-none"
      />
      {tileError && <TileFallbackOverlay />}
      {process.env.NODE_ENV === "development" && <DebugOverlay state={debug} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Debug Overlay (dev-only)
// ---------------------------------------------------------------------------

type MapDebugState = {
  featuresLen: number;
  mapLoaded: boolean;
  sourceExists: boolean;
  layerExists: boolean;
  containerW: number;
  containerH: number;
  canvasW: number;
  canvasH: number;
  hasCanvas: boolean;
  hasGl: boolean;
  zoom: number;
  center: [number, number];
  lastError: string;
};

const initialDebug: MapDebugState = {
  featuresLen: 0,
  mapLoaded: false,
  sourceExists: false,
  layerExists: false,
  containerW: 0,
  containerH: 0,
  canvasW: 0,
  canvasH: 0,
  hasCanvas: false,
  hasGl: false,
  zoom: 0,
  center: [0, 0],
  lastError: "",
};

function DebugOverlay({ state }: { state: MapDebugState }) {
  const ok = (v: boolean) => (v ? "✓" : "✗");
  const color = (v: boolean) => (v ? "#9ee76b" : "#ec6d72");
  const row = (k: string, v: string, c?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#9ca3af" }}>{k}</span>
      <span style={{ color: c ?? "#e5e7eb", fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        right: 8,
        bottom: 8,
        zIndex: 30,
        minWidth: 240,
        maxWidth: 280,
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(8, 12, 22, 0.92)",
        color: "#e5e7eb",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontSize: 10,
        lineHeight: 1.55,
        backdropFilter: "blur(6px)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ color: "#5cd2e6", fontWeight: 600, marginBottom: 4, letterSpacing: "0.08em" }}>
        STATIONMAP · DEBUG
      </div>
      {row("features", String(state.featuresLen))}
      {row("mapLoaded", ok(state.mapLoaded), color(state.mapLoaded))}
      {row("source", ok(state.sourceExists), color(state.sourceExists))}
      {row("layer", ok(state.layerExists), color(state.layerExists))}
      {row("canvas", ok(state.hasCanvas), color(state.hasCanvas))}
      {row("gl ctx", ok(state.hasGl), color(state.hasGl))}
      {row("container", `${state.containerW}×${state.containerH}`)}
      {row("canvas size", `${state.canvasW}×${state.canvasH}`)}
      {row("zoom", state.zoom.toFixed(2))}
      {row("center", `${state.center[0]}, ${state.center[1]}`)}
      {state.lastError && row("lastError", state.lastError, "#ec6d72")}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 子组件：辅助态
// ---------------------------------------------------------------------------

function MapMetaChip({
  data,
  isFetching,
}: {
  data: StationGeoFeatureCollection | undefined;
  isFetching: boolean;
}) {
  const counts = useMemo(() => {
    if (!data) return null;
    const c: Record<StationRiskType, number> = {
      normal: 0,
      empty: 0,
      full: 0,
      abnormal: 0,
      offline: 0,
    };
    for (const f of data.features) c[f.properties.risk_type]++;
    return c;
  }, [data]);

  if (!counts || !data) {
    return (
      <span className="rounded-full border border-border/50 bg-card/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        加载中
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-medium tabular-nums">
      <span
        className={cn(
          "rounded-full border border-border/50 bg-card/40 px-2 py-0.5",
          "uppercase tracking-[0.18em] text-muted-foreground",
        )}
      >
        {data.features.length} 站点
      </span>
      <RiskChip color={RISK_COLOR.empty} value={counts.empty} label="空" />
      <RiskChip color={RISK_COLOR.full} value={counts.full} label="满" />
      <RiskChip color={RISK_COLOR.abnormal} value={counts.abnormal} label="异常" />
      <RiskChip color={RISK_COLOR.offline} value={counts.offline} label="离线" />
      {isFetching && (
        <RefreshCw className="h-3 w-3 animate-spin text-[var(--neon-cyan)]" />
      )}
    </div>
  );
}

function RiskChip({
  color,
  value,
  label,
}: {
  color: string;
  value: number;
  label: string;
}) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px]"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}14`,
        color,
      }}
    >
      {label} {value}
    </span>
  );
}

function MapSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 p-4">
      <Skeleton className="h-full w-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          正在加载站点空间数据…
        </span>
      </div>
    </div>
  );
}

function ErrorBlock({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="h-7 w-7 text-[var(--neon-rose)]" />
      <div className="text-sm font-medium text-foreground">站点地图加载失败</div>
      <div className="max-w-xs text-xs text-muted-foreground">
        {message || "无法获取 /api/dashboard/stations/geojson"}
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function TileFallbackOverlay() {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 max-w-[260px] rounded-md border border-[var(--neon-amber)]/40 bg-background/85 px-3 py-2 text-[11px] text-[var(--neon-amber)] backdrop-blur">
      底图 tile 加载受阻，已回退到 OSM raster。站点圈点按经纬度位置正常渲染。
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popup HTML（手写以减小依赖；保持暗色风格）
// ---------------------------------------------------------------------------

function buildPopupHtml(p: StationGeoFeature["properties"]): string {
  const updated = p.updated_at ? formatRelative(p.updated_at) : "—";
  const occ = formatOccupancy(p.occupancy_rate);
  const riskColor = RISK_COLOR[p.risk_type] ?? RISK_COLOR.normal;
  const riskLabel = RISK_LABEL[p.risk_type] ?? p.risk_type;
  const detailUrl = `/stations/${encodeURIComponent(p.station_code)}`;
  return `
    <div style="
      font-family: var(--font-sans), system-ui, sans-serif;
      color: #e5e7eb;
      min-width: 220px;
      padding: 4px 4px 2px;
    ">
      <div style="
        display:flex; align-items:center; gap:8px;
        font-size: 12px; font-weight: 600; color: #f9fafb;
        margin-bottom: 2px;
      ">
        <span style="
          display:inline-block; width:8px; height:8px; border-radius:50%;
          background:${riskColor}; box-shadow: 0 0 8px ${riskColor};
        "></span>
        ${escapeHtml(p.name)}
      </div>
      <div style="font-size: 10px; color: #9ca3af; letter-spacing: 0.06em;">
        ${escapeHtml(p.station_code)} · ${escapeHtml(p.region_name ?? "未知区域")}
      </div>
      <div style="margin-top:8px; display:grid; grid-template-columns:repeat(3,1fr); gap:6px; font-size:11px;">
        <div><div style="color:#9ca3af">可借</div><div style="font-weight:600; font-variant-numeric: tabular-nums;">${p.bikes_available}</div></div>
        <div><div style="color:#9ca3af">可还</div><div style="font-weight:600; font-variant-numeric: tabular-nums;">${p.docks_available}</div></div>
        <div><div style="color:#9ca3af">容量</div><div style="font-weight:600; font-variant-numeric: tabular-nums;">${p.capacity}</div></div>
      </div>
      <div style="margin-top:6px; font-size:11px;">
        <span style="color:#9ca3af">占用率 </span>
        <span style="font-weight:600; font-variant-numeric: tabular-nums;">${occ}</span>
      </div>
      <div style="margin-top:8px; display:flex; align-items:center; justify-content:space-between; font-size:10px;">
        <span style="
          padding: 2px 6px; border-radius: 999px;
          background: ${riskColor}22; border: 1px solid ${riskColor}55;
          color: ${riskColor}; letter-spacing: 0.04em;
        ">${escapeHtml(riskLabel)}</span>
        <span style="color:#9ca3af">${escapeHtml(updated)}</span>
      </div>
      <a href="${detailUrl}" style="
        display:block; margin-top:10px; padding:5px 0; text-align:center;
        font-size: 11px; font-weight: 500; color: #5cd2e6;
        border: 1px solid rgba(92,210,230,0.25); border-radius: 6px;
        background: rgba(92,210,230,0.08);
        text-decoration: none; letter-spacing: 0.04em;
        transition: all 0.15s ease;
      " onmouseover="this.style.background='rgba(92,210,230,0.16)';this.style.borderColor='rgba(92,210,230,0.45)';" onmouseout="this.style.background='rgba(92,210,230,0.08)';this.style.borderColor='rgba(92,210,230,0.25)';">
        查看详情 →
      </a>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
