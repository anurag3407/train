"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import HotspotsPanel from "@/components/HotspotsPanel";
import PredictForm from "@/components/PredictForm";
import ResultPanel from "@/components/ResultPanel";
import { api, API_BASE } from "@/lib/api";
import type {
  HealthResponse,
  Hotspot,
  Metadata,
  PredictRequest,
  PredictResponse,
} from "@/lib/types";

const MapPanel = dynamic(() => import("@/components/MapPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-2xl border border-ink-700 bg-ink-900 text-xs uppercase tracking-widest text-ink-400">
      loading map…
    </div>
  ),
});

const DEFAULT_LOC = { lat: 12.9716, lon: 77.5946 }; // Bengaluru centre

export default function HomePage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiUp, setApiUp] = useState<"unknown" | "up" | "down">("unknown");

  const [selected, setSelected] = useState<{ lat: number; lon: number }>(DEFAULT_LOC);

  const [predictResult, setPredictResult] = useState<PredictResponse | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  const [hour, setHour] = useState<number>(new Date().getHours());
  const [hotspotCorridor, setHotspotCorridor] = useState<string>("");
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  // Initial: metadata + health.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, h] = await Promise.all([api.metadata(), api.health()]);
        if (cancelled) return;
        setMetadata(m);
        setHealth(h);
        setApiUp("up");
      } catch (err) {
        if (cancelled) return;
        setApiUp("down");
        console.error("metadata/health failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hotspots: refetch when hour or corridor changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHotspotsLoading(true);
      try {
        const data = await api.hotspots({
          hour,
          corridor: hotspotCorridor || undefined,
          top: 25,
          min_events: 2,
        });
        if (cancelled) return;
        setHotspots(data);
      } catch (err) {
        if (cancelled) return;
        console.error("hotspots failed", err);
        setHotspots([]);
      } finally {
        if (!cancelled) setHotspotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hour, hotspotCorridor, apiUp]);

  const handlePick = useCallback((lat: number, lon: number) => {
    setSelected({ lat, lon });
  }, []);

  const handleSubmit = useCallback(async (req: PredictRequest) => {
    setPredictLoading(true);
    setPredictError(null);
    setPredictResult(null);
    try {
      const res = await api.predict(req);
      setPredictResult(res);
    } catch (err: any) {
      setPredictError(err?.message ?? String(err));
    } finally {
      setPredictLoading(false);
    }
  }, []);

  const handlePickHotspot = useCallback((h: Hotspot) => {
    if (h.lat != null && h.lon != null) setSelected({ lat: h.lat, lon: h.lon });
  }, []);

  const metricsSummary = useMemo(() => {
    const m = health?.metrics as any;
    if (!m) return null;
    const sevAcc = m?.severity?.accuracy;
    const closureAuc = m?.closure?.auc;
    const medErr = m?.duration?.median_ae_min;
    return { sevAcc, closureAuc, medErr };
  }, [health]);

  return (
    <main className="grain relative min-h-screen bg-ink-950">
      {/* Header */}
      <header className="relative z-10 border-b border-ink-800 bg-ink-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-accent-500/40 bg-accent-500/10 font-mono text-accent-400">
              A
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-ink-400">
                Astram · Bengaluru
              </div>
              <div className="text-sm font-semibold text-ink-100">
                Event-Driven Congestion Forecaster
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            {metricsSummary && (
              <>
                <MetricBadge
                  label="severity"
                  value={`${((metricsSummary.sevAcc ?? 0) * 100).toFixed(0)}%`}
                />
                <MetricBadge
                  label="closure AUC"
                  value={`${(metricsSummary.closureAuc ?? 0).toFixed(2)}`}
                />
                <MetricBadge
                  label="dur ±"
                  value={`${Math.round(metricsSummary.medErr ?? 0)}m`}
                />
              </>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-2.5 py-1 text-ink-300">
              <span
                className={
                  "h-1.5 w-1.5 rounded-full " +
                  (apiUp === "up"
                    ? "bg-accent-400"
                    : apiUp === "down"
                      ? "bg-danger-500"
                      : "bg-ink-500")
                }
              />
              <span className="font-mono text-[10px] uppercase tracking-wider">
                {apiUp === "up"
                  ? "api online"
                  : apiUp === "down"
                    ? "api offline"
                    : "checking"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {apiUp === "down" && (
        <div className="relative z-10 border-b border-danger-500/30 bg-danger-500/10 px-6 py-2 text-center text-xs text-danger-400">
          Cannot reach FastAPI at <code className="font-mono">{API_BASE}</code>.
          Start it with{" "}
          <code className="font-mono">
            uvicorn src.api:app --host 0.0.0.0 --port 8000
          </code>{" "}
          from the project root.
        </div>
      )}

      {/* Body grid */}
      <section className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-12 gap-4 px-6 py-4">
        {/* Left: form + result */}
        <aside className="col-span-12 space-y-4 lg:col-span-3">
          <Card title="Compose event">
            <PredictForm
              metadata={metadata}
              lat={selected.lat}
              lon={selected.lon}
              loading={predictLoading}
              onSubmit={handleSubmit}
            />
          </Card>

          <ResultPanel
            result={predictResult}
            loading={predictLoading}
            error={predictError}
          />
        </aside>

        {/* Centre: map */}
        <div className="col-span-12 h-[calc(100vh-180px)] lg:col-span-6">
          <MapPanel
            selected={{
              lat: selected.lat,
              lon: selected.lon,
              severity: predictResult?.severity ?? "Medium",
            }}
            hotspots={hotspots}
            onPick={handlePick}
            highlightHotspot={highlight}
          />
        </div>

        {/* Right: hotspots */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="h-[calc(100vh-180px)] rounded-2xl border border-ink-700 bg-ink-900/40 p-5">
            <HotspotsPanel
              metadata={metadata}
              hour={hour}
              setHour={setHour}
              corridor={hotspotCorridor}
              setCorridor={setHotspotCorridor}
              hotspots={hotspots}
              loading={hotspotsLoading}
              highlight={highlight}
              setHighlight={setHighlight}
              onPickHotspot={handlePickHotspot}
            />
          </div>
        </aside>
      </section>

      <footer className="relative z-10 border-t border-ink-800 px-6 py-3 text-[11px] text-ink-500">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div>
            Forecasts from FastAPI microservice · trained on Astram event ledger
          </div>
          <div>
            map &copy; Mappls / OSM · ui &copy; Astram-Ops {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-5">
      <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-ink-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900 px-2.5 py-1 text-ink-300">
      <span className="text-[9px] uppercase tracking-wider text-ink-500">
        {label}
      </span>
      <span className="font-mono text-[11px] text-accent-400">{value}</span>
    </div>
  );
}
