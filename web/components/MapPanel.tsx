"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Hotspot, Severity } from "@/lib/types";
import { severityHex } from "@/lib/ui";

const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_KEY || "";
const BENGALURU: [number, number] = [12.9716, 77.5946];
const MAPPLS_TIMEOUT_MS = 8000;

declare global {
  interface Window {
    mappls?: any;
    L?: any;
    __mapplsLoaded?: boolean;
    __leafletLoaded?: boolean;
  }
}

let mapplsLoadPromise: Promise<void> | null = null;

function loadMapplsSdk(key: string): Promise<void> {
  if (mapplsLoadPromise) return mapplsLoadPromise;
  mapplsLoadPromise = new Promise<void>((resolve, reject) => {
    if (window.mappls && typeof window.mappls.Map === "function") {
      return resolve();
    }
    // Mappls SDK loads synchronously once the script is parsed.
    // Do NOT use a callback= param — it is not supported. Wait on onload
    // then poll briefly for window.mappls.Map (some SDK variants attach late).
    const sdkUrl =
      `https://apis.mappls.com/advancedmaps/api/${encodeURIComponent(key)}/map_sdk` +
      `?layer=vector&v=3.0`;
    const existing = document.querySelector(
      'script[data-marker="mappls-sdk"]',
    ) as HTMLScriptElement | null;
    const s = existing ?? document.createElement("script");
    if (!existing) {
      s.src = sdkUrl;
      s.async = true;
      s.defer = true;
      s.dataset.marker = "mappls-sdk";
      document.head.appendChild(s);
    }
    let settled = false;
    const finish = (ok: boolean, err?: string) => {
      if (settled) return;
      settled = true;
      ok ? resolve() : reject(new Error(err || "Mappls SDK failed"));
    };
    s.addEventListener("load", () => {
      const start = Date.now();
      const poll = () => {
        if (window.mappls && typeof window.mappls.Map === "function") {
          finish(true);
        } else if (Date.now() - start > 4000) {
          finish(false, "Mappls SDK loaded but window.mappls.Map missing (bad key or wrong SDK type?)");
        } else {
          setTimeout(poll, 100);
        }
      };
      poll();
    });
    s.addEventListener("error", () =>
      finish(false, "Mappls SDK network error"),
    );
    setTimeout(
      () => finish(false, `Mappls SDK timeout (${MAPPLS_TIMEOUT_MS}ms)`),
      MAPPLS_TIMEOUT_MS,
    );
  });
  return mapplsLoadPromise;
}

export interface SelectedPoint {
  lat: number;
  lon: number;
  severity?: Severity;
}

interface MapPanelProps {
  selected: SelectedPoint | null;
  hotspots: Hotspot[];
  onPick: (lat: number, lon: number) => void;
  highlightHotspot?: string | null;
}

function loadScript(src: string, marker: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any)[marker]) return resolve();
    const existing = document.querySelector(
      `script[data-marker="${marker}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.marker = marker;
    s.onload = () => {
      (window as any)[marker] = true;
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadStylesheet(href: string, marker: string): void {
  if (document.querySelector(`link[data-marker="${marker}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  l.dataset.marker = marker;
  document.head.appendChild(l);
}

export default function MapPanel(props: MapPanelProps) {
  const { selected, hotspots, onPick, highlightHotspot } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const hotspotLayerRef = useRef<any[]>([]);
  const [mode, setMode] = useState<"loading" | "mappls" | "leaflet" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Initialize map (Mappls first, Leaflet fallback).
  useEffect(() => {
    let cancelled = false;

    async function initLeaflet(reason?: string) {
      loadStylesheet(
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        "leaflet-css",
      );
      await loadScript(
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
        "__leafletLoaded",
      );
      if (cancelled || !containerRef.current) return;
      const L = window.L;
      const map = L.map(containerRef.current, {
        center: BENGALURU,
        zoom: 11,
        zoomControl: true,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
        },
      ).addTo(map);
      mapRef.current = map;
      map.on("click", (e: any) => onPick(e.latlng.lat, e.latlng.lng));
      if (reason) setErrorMsg(reason);
      setMode("leaflet");
    }

    async function init() {
      if (MAPPLS_KEY) {
        try {
          await loadMapplsSdk(MAPPLS_KEY);
          if (cancelled || !containerRef.current) return;
          // Mappls requires the container to have an id.
          if (!containerRef.current.id) {
            containerRef.current.id = "mappls-map-" + Math.random().toString(36).slice(2, 8);
          }
          // Mappls measures container size at construction. Force layout commit first.
          const containerEl = containerRef.current;
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          containerEl.offsetHeight;

          const map = new window.mappls.Map(containerEl.id, {
            center: BENGALURU,
            zoom: 11,
            zoomControl: true,
            location: false,
          });
          // Some SDK versions return a wrapper; wait for ready.
          if (typeof map.on === "function") {
            map.on("click", (e: any) => {
              const lat = e.lngLat?.lat ?? e.latlng?.lat;
              const lng = e.lngLat?.lng ?? e.latlng?.lng;
              if (lat != null && lng != null) onPick(lat, lng);
            });
          }
          mapRef.current = map;
          setMode("mappls");

          // Mappls Map computes size once at init — if container animated in,
          // we now force a resize. Repeat across a few RAF ticks to cover
          // animation-driven layout shifts.
          const forceResize = () => {
            try {
              if (typeof map.resize === "function") map.resize();
              else if (typeof map.invalidateSize === "function") map.invalidateSize();
              else if (map._map?.resize) map._map.resize();
            } catch {}
          };
          requestAnimationFrame(forceResize);
          setTimeout(forceResize, 150);
          setTimeout(forceResize, 500);
          setTimeout(forceResize, 1200);

          // Resize observer keeps it correct on window resize / layout changes.
          if (typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver(() => forceResize());
            ro.observe(containerEl);
            (mapRef.current as any).__ro = ro;
          }
          window.addEventListener("resize", forceResize);
          (mapRef.current as any).__resizeHandler = forceResize;

          return;
        } catch (err: any) {
          console.warn("Mappls SDK failed, falling back to OSM:", err);
          // fall through to Leaflet
          await initLeaflet(
            err?.message ? `Mappls fallback: ${err.message}` : "Mappls fallback active.",
          );
          return;
        }
      }
      await initLeaflet();
    }

    init().catch((err) => {
      setErrorMsg(err?.message || String(err));
      setMode("error");
    });

    return () => {
      cancelled = true;
      const m = mapRef.current as any;
      if (m) {
        try { m.__ro?.disconnect?.(); } catch {}
        try {
          if (m.__resizeHandler) {
            window.removeEventListener("resize", m.__resizeHandler);
          }
        } catch {}
        if (m.remove) {
          try { m.remove(); } catch {}
        }
      }
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update / create the selected-point marker.
  useEffect(() => {
    if (!mapRef.current || mode === "loading" || mode === "error") return;
    const map = mapRef.current;
    const color = severityHex(selected?.severity ?? "Medium");
    if (selectedMarkerRef.current) {
      try {
        if (mode === "leaflet") {
          map.removeLayer(selectedMarkerRef.current);
        } else {
          selectedMarkerRef.current.remove();
        }
      } catch {}
      selectedMarkerRef.current = null;
    }
    if (!selected) return;
    if (mode === "leaflet") {
      const L = window.L;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:22px;height:22px;border-radius:50%;
          background:${color};border:3px solid #0a0d14;
          box-shadow:0 0 0 4px ${color}55, 0 0 18px ${color};
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      selectedMarkerRef.current = L.marker(
        [selected.lat, selected.lon],
        { icon },
      ).addTo(map);
      map.panTo([selected.lat, selected.lon]);
    } else {
      // Mappls
      const m = new window.mappls.Marker({
        map,
        position: { lat: selected.lat, lng: selected.lon },
        icon_url: undefined,
        fitbounds: false,
        draggable: false,
      });
      selectedMarkerRef.current = m;
      map.setCenter([selected.lat, selected.lon]);
    }
  }, [selected, mode]);

  // Render hotspot markers.
  useEffect(() => {
    if (!mapRef.current || mode === "loading" || mode === "error") return;
    const map = mapRef.current;
    // clear previous
    for (const m of hotspotLayerRef.current) {
      try {
        if (mode === "leaflet") map.removeLayer(m);
        else m.remove();
      } catch {}
    }
    hotspotLayerRef.current = [];

    const maxCount = Math.max(
      1,
      ...hotspots.map((h) => h.event_count),
    );
    for (const h of hotspots) {
      if (h.lat == null || h.lon == null) continue;
      const ratio = h.event_count / maxCount;
      const radius = 8 + ratio * 22;
      const color =
        h.closure_rate > 0.2
          ? "#ff3d3d"
          : h.avg_duration_min > 240
            ? "#ff8a3c"
            : "#5cf2c2";

      const popupHtml = `
        <div style="font-family:Inter,system-ui;min-width:220px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#8d97ae;text-transform:uppercase;letter-spacing:.08em">
            <span>${h.corridor}</span><span>${h.hour}:00</span>
          </div>
          <div style="font-size:14px;font-weight:600;margin-top:4px;color:#e6ebf5">
            ${h.junction === "unknown" ? "Corridor segment" : h.junction}
          </div>
          <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#c3c9d7">
            <div>events <b style="color:#fff">${h.event_count}</b></div>
            <div>avg <b style="color:#fff">${Math.round(h.avg_duration_min)}m</b></div>
            <div>closure <b style="color:#fff">${(h.closure_rate * 100).toFixed(0)}%</b></div>
            <div>high-prio <b style="color:#fff">${(h.high_priority_rate * 100).toFixed(0)}%</b></div>
          </div>
          <div style="margin-top:6px;font-size:12px;color:#8d97ae">
            top cause: <span style="color:#5cf2c2">${h.top_cause}</span>
          </div>
        </div>`;

      if (mode === "leaflet") {
        const L = window.L;
        const isHL = highlightHotspot === `${h.corridor}|${h.junction}`;
        const circle = L.circleMarker([h.lat, h.lon], {
          radius,
          color,
          weight: isHL ? 3 : 1,
          fillColor: color,
          fillOpacity: 0.35,
        }).addTo(map);
        circle.bindPopup(popupHtml);
        circle.on("click", () => onPick(h.lat as number, h.lon as number));
        hotspotLayerRef.current.push(circle);
      } else {
        const m = new window.mappls.Marker({
          map,
          position: { lat: h.lat, lng: h.lon },
          popupHtml,
        });
        m.on?.("click", () => onPick(h.lat as number, h.lon as number));
        hotspotLayerRef.current.push(m);
      }
    }
  }, [hotspots, mode, highlightHotspot, onPick]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-ink-700">
      <div
        ref={containerRef}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%", position: "absolute" }}
      />

      {/* Floating badges */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full bg-ink-900/80 px-3 py-1.5 text-[11px] uppercase tracking-widest text-ink-300 backdrop-blur ring-1 ring-ink-700">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-400 shadow-glow" />
          {mode === "mappls"
            ? "mappls vector"
            : mode === "leaflet"
              ? "osm fallback"
              : mode === "loading"
                ? "loading map"
                : "map error"}
        </div>
        {mode === "leaflet" && !MAPPLS_KEY && (
          <div className="rounded-md bg-ink-900/80 px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-400 backdrop-blur ring-1 ring-ink-700">
            set NEXT_PUBLIC_MAPPLS_KEY for vector tiles
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl bg-ink-900/80 px-3 py-2 text-[11px] text-ink-300 backdrop-blur ring-1 ring-ink-700">
        <div className="mb-1 text-[10px] uppercase tracking-widest text-ink-400">
          hotspot
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-400" />
          <span>routine</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-warn-500" />
          <span>long-running</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger-500" />
          <span>closure-heavy</span>
        </div>
      </div>

      {/* Help footer */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink-900/80 px-4 py-1.5 text-[11px] text-ink-300 backdrop-blur ring-1 ring-ink-700">
        click anywhere on the map to drop a candidate event location
      </div>

      {mode === "error" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink-950/85 text-center text-sm text-danger-400">
          <div className="max-w-md p-6">
            map sdk failed: {errorMsg}
            <div className="mt-2 text-xs text-ink-400">
              Check NEXT_PUBLIC_MAPPLS_KEY or network access. App will keep
              working without a map.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
