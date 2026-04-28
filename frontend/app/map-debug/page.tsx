"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MaplibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * /map-debug — 首页地图空白问题的最小复现页面
 *
 * 严格不带：DashboardPanel / motion / shadcn Card / 任何业务包裹。
 * 唯一目的：把 MapLibre canvas 隔离出来，看是 MapLibre 本身坏了，
 *           还是首页布局/CSS 把 canvas 挡住了。
 *
 * 三档可独立切换：
 *   1) bg-only style + 硬编码红点（不联网，不依赖 tile）
 *   2) bg-only + 硬编码红点 + /api 拉的 150 个站点散点
 *   3) Carto Dark Matter raster 底图 + 站点散点
 *
 * 右下显示 DebugOverlay：features / mapLoaded / source / layer
 *                       / canvas / gl ctx / 容器尺寸 / canvas 尺寸 / zoom / center / lastError
 */

type DebugState = {
  featuresLen: number;
  mapLoaded: boolean;
  styleLoaded: boolean;
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

const initial: DebugState = {
  featuresLen: 0,
  mapLoaded: false,
  styleLoaded: false,
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

type Mode = "bg" | "bg+stations" | "raster+stations";

export default function MapDebugPage() {
  const [mode, setMode] = useState<Mode>("bg");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0d18",
        color: "#e5e7eb",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        padding: 20,
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        /map-debug — MapLibre 最小复现页面
      </h1>
      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
        当前模式：<b style={{ color: "#5cd2e6" }}>{mode}</b>　·　切换下方按钮逐档增加复杂度，
        定位空白原因到底是 MapLibre / WebGL / 站点 source / Carto tile 中的哪一环。
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <ModeBtn cur={mode} v="bg" set={setMode}>
          ① bg layer + 红点（不联网）
        </ModeBtn>
        <ModeBtn cur={mode} v="bg+stations" set={setMode}>
          ② bg + 红点 + 150 站点
        </ModeBtn>
        <ModeBtn cur={mode} v="raster+stations" set={setMode}>
          ③ Carto raster + 站点（同首页）
        </ModeBtn>
      </div>

      <DebugMap mode={mode} />

      <div style={{ marginTop: 24, fontSize: 12, color: "#9ca3af", maxWidth: 760 }}>
        <p style={{ margin: 0 }}>
          检验顺序：
        </p>
        <ol style={{ paddingLeft: 18, margin: "6px 0" }}>
          <li>
            <b>① bg-only</b>：如果整个 600px 区域是纯 #0a0d18，<b>红点也看不到</b> →
            说明是 MapLibre canvas 自身没渲染（CSS 高度 / WebGL / style.layers 顺序），
            而不是 tile 或 API 问题。
          </li>
          <li>
            <b>②</b>：① 通过后再看 150 个站点散点是否出现 → 验证 GeoJSON source / layer 链路。
          </li>
          <li>
            <b>③</b>：② 通过后再看 Carto 暗底图是否加载 → 仅这步失败 = 网络/CSP 拦了 tile 请求。
          </li>
        </ol>
      </div>
    </div>
  );
}

function ModeBtn({
  cur,
  v,
  set,
  children,
}: {
  cur: Mode;
  v: Mode;
  set: (m: Mode) => void;
  children: React.ReactNode;
}) {
  const active = cur === v;
  return (
    <button
      type="button"
      onClick={() => set(v)}
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 12,
        border: `1px solid ${active ? "#5cd2e6" : "rgba(255,255,255,0.16)"}`,
        background: active ? "rgba(92,210,230,0.12)" : "rgba(255,255,255,0.04)",
        color: active ? "#5cd2e6" : "#e5e7eb",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function DebugMap({ mode }: { mode: Mode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [debug, setDebug] = useState<DebugState>(initial);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initRect = container.getBoundingClientRect();
    console.log("[map-debug] mount mode=", mode, "container", initRect);
    setDebug((d) => ({
      ...d,
      containerW: Math.round(initRect.width),
      containerH: Math.round(initRect.height),
    }));

    const sources: maplibregl.StyleSpecification["sources"] = {};
    const layers: maplibregl.LayerSpecification[] = [
      { id: "bg", type: "background", paint: { "background-color": "#0a0d18" } },
    ];

    if (mode === "raster+stations") {
      sources.basemap = {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
      };
      layers.push({
        id: "basemap-tiles",
        type: "raster",
        source: "basemap",
        minzoom: 0,
        maxzoom: 19,
      });
    }

    const map = new maplibregl.Map({
      container,
      style: { version: 8, sources, layers },
      center: [105, 35],
      zoom: 1.6,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("error", (ev) => {
      const errMsg = (ev as { error?: Error })?.error?.message ?? String(ev);
      console.warn("[map-debug] map error:", errMsg);
      setDebug((d) => ({ ...d, lastError: errMsg.slice(0, 160) }));
    });

    map.on("load", () => {
      const canvas = map.getCanvas();
      const cRect = canvas?.getBoundingClientRect();
      const cnt = container.getBoundingClientRect();

      console.log(
        "[map-debug] load done; loaded=",
        map.loaded(),
        "styleLoaded=",
        map.isStyleLoaded(),
      );
      console.log("[map-debug] canvas rect", cRect);
      console.log("[map-debug] container rect", cnt);
      console.log(
        "[map-debug] style.layers",
        map.getStyle().layers?.map((l) => l.id),
      );

      // 任何模式都有红点（验证图层渲染管线）
      map.addSource("debug-pin", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [116.4, 39.9] },
              properties: {},
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
          "circle-radius": 14,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 1,
        },
      });

      setDebug((d) => ({
        ...d,
        mapLoaded: true,
        styleLoaded: !!map.isStyleLoaded(),
        canvasW: cRect ? Math.round(cRect.width) : 0,
        canvasH: cRect ? Math.round(cRect.height) : 0,
        containerW: Math.round(cnt.width),
        containerH: Math.round(cnt.height),
        hasCanvas: !!canvas,
        hasGl: !!(canvas && canvas.getContext),
        zoom: Number(map.getZoom().toFixed(2)),
        center: [
          Number(map.getCenter().lng.toFixed(3)),
          Number(map.getCenter().lat.toFixed(3)),
        ],
      }));

      // 模式 ②③ 加站点
      if (mode === "bg+stations" || mode === "raster+stations") {
        fetch("/api/dashboard/stations/geojson")
          .then((r) => {
            console.log("[map-debug] /api/dashboard/stations/geojson status=", r.status);
            return r.json();
          })
          .then((geo: GeoJSON.FeatureCollection) => {
            console.log(
              "[map-debug] geojson features=",
              geo.features?.length ?? 0,
              "first=",
              geo.features?.[0],
            );

            map.addSource("stations", { type: "geojson", data: geo });
            map.addLayer({
              id: "stations-circle",
              type: "circle",
              source: "stations",
              paint: {
                "circle-color": "#5cd2e6",
                "circle-radius": 6,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#0b0e1a",
                "circle-opacity": 0.95,
              },
            });

            // fitBounds
            const bounds = new maplibregl.LngLatBounds();
            for (const f of geo.features ?? []) {
              const c = (f.geometry as GeoJSON.Point).coordinates as [number, number];
              bounds.extend(c);
            }
            if (!bounds.isEmpty()) {
              map.fitBounds(bounds, {
                padding: 60,
                duration: 0,
                maxZoom: 5,
              });
            }

            const sourceExists = !!map.getSource("stations");
            const layerExists = !!map.getLayer("stations-circle");
            console.log(
              "[map-debug] after addLayer; source=",
              sourceExists,
              "layer=",
              layerExists,
            );
            setDebug((d) => ({
              ...d,
              featuresLen: geo.features?.length ?? 0,
              sourceExists,
              layerExists,
              zoom: Number(map.getZoom().toFixed(2)),
              center: [
                Number(map.getCenter().lng.toFixed(3)),
                Number(map.getCenter().lat.toFixed(3)),
              ],
            }));
          })
          .catch((e: Error) => {
            console.error("[map-debug] geojson fetch error:", e);
            setDebug((d) => ({ ...d, lastError: `fetch: ${e.message}`.slice(0, 160) }));
          });
      }

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

    const raf = requestAnimationFrame(() => {
      try {
        map.resize();
      } catch {
        /* noop */
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      try {
        map.remove();
      } catch {
        /* noop */
      }
      mapRef.current = null;
    };
  }, [mode]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: 600,
          minHeight: 600,
          borderRadius: 6,
          overflow: "hidden",
          background: "#0a0d18",
          border: "1px solid rgba(255,255,255,0.16)",
        }}
      />
      <DebugBox state={debug} />
    </div>
  );
}

function DebugBox({ state }: { state: DebugState }) {
  const ok = (v: boolean) => (v ? "✓" : "✗");
  const color = (v: boolean) => (v ? "#9ee76b" : "#ec6d72");
  const row = (k: string, v: string, c?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#9ca3af" }}>{k}</span>
      <span style={{ color: c ?? "#e5e7eb", fontVariantNumeric: "tabular-nums" }}>
        {v}
      </span>
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        right: 8,
        bottom: 8,
        zIndex: 30,
        minWidth: 250,
        maxWidth: 290,
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(8, 12, 22, 0.92)",
        color: "#e5e7eb",
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        lineHeight: 1.55,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          color: "#5cd2e6",
          fontWeight: 600,
          marginBottom: 4,
          letterSpacing: "0.08em",
        }}
      >
        MAP-DEBUG · STATE
      </div>
      {row("features", String(state.featuresLen))}
      {row("mapLoaded", ok(state.mapLoaded), color(state.mapLoaded))}
      {row("styleLoaded", ok(state.styleLoaded), color(state.styleLoaded))}
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
