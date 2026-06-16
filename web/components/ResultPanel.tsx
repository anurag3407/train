"use client";

import type { PredictResponse, Severity } from "@/lib/types";
import { SEVERITY_TONE, prettifyCause } from "@/lib/ui";

interface ResultPanelProps {
  result: PredictResponse | null;
  loading: boolean;
  error: string | null;
}

export default function ResultPanel({ result, loading, error }: ResultPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
        <Shimmer className="h-7 w-1/2" />
        <Shimmer className="h-3 w-2/3" />
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Shimmer className="h-16" />
          <Shimmer className="h-16" />
          <Shimmer className="h-16" />
        </div>
        <Shimmer className="h-20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-500/30 bg-danger-500/10 p-5 text-sm text-danger-400">
        <div className="text-xs uppercase tracking-widest text-danger-400/80">
          Prediction failed
        </div>
        <div className="mt-1 break-words font-mono text-[12px] text-danger-400">
          {error}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/30 p-6 text-center text-sm text-ink-400">
        Fill the form and submit to forecast event impact.
      </div>
    );
  }

  const tone = SEVERITY_TONE[result.severity];
  const closureColor =
    result.road_closure_probability >= 0.5
      ? "text-danger-400"
      : result.road_closure_probability >= 0.25
        ? "text-warn-400"
        : "text-accent-400";

  return (
    <div className="space-y-4">
      {/* Severity header */}
      <div
        className={
          "relative overflow-hidden rounded-2xl border bg-ink-900/60 p-5 " +
          tone.bg +
          " " +
          "border-ink-700 ring-1 " +
          tone.ring
        }
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-ink-400">
              Predicted Severity
            </div>
            <div className={"mt-1 font-mono text-3xl font-bold " + tone.text}>
              {result.severity}
            </div>
            <div className="mt-1 text-[11px] text-ink-400">
              Model confidence{" "}
              <span className={"font-mono " + tone.text}>
                {(result.severity_confidence * 100).toFixed(0)}%
              </span>
              {result.rule_severity_fallback !== result.severity && (
                <>
                  {" · rule fallback "}
                  <span className="font-mono text-ink-200">
                    {result.rule_severity_fallback}
                  </span>
                </>
              )}
            </div>
          </div>
          <SeverityPulse tone={tone.dot} />
        </div>

        <DistributionBar dist={result.severity_distribution} />
      </div>

      {/* Quant stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat
          label="Duration"
          value={result.predicted_duration_human}
          sub={`${Math.round(result.predicted_duration_minutes)} min`}
        />
        <Stat
          label="Road closure"
          value={`${(result.road_closure_probability * 100).toFixed(0)}%`}
          sub={result.likely_road_closure ? "Likely" : "Unlikely"}
          valueClass={closureColor}
        />
        <Stat
          label="Manpower"
          value={`${result.resource_plan.manpower_count}`}
          sub="constables"
        />
      </div>

      {/* Resource plan */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
        <div className="text-[10px] uppercase tracking-[0.25em] text-ink-400">
          Recommended Resource Plan
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <PlanTile
            label="Barricades"
            value={result.resource_plan.barricades_count}
          />
          <PlanTile
            label="Diversion"
            value={result.resource_plan.needs_diversion ? "Required" : "Not needed"}
            tone={result.resource_plan.needs_diversion ? "warn" : "ok"}
          />
        </div>

        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-ink-400">
            Diversion strategy
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">
            {result.resource_plan.diversion_plan}
          </p>
        </div>

        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-ink-400">
            Suggested units
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.resource_plan.suggested_units.map((u) => (
              <span
                key={u}
                className="rounded-full border border-ink-600 bg-ink-800 px-2.5 py-1 text-[11px] text-ink-200"
              >
                {u}
              </span>
            ))}
          </div>
        </div>

        {result.resource_plan.notes.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-ink-400">
              Notes
            </div>
            <ul className="space-y-1 text-[12px] text-ink-300">
              {result.resource_plan.notes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent-400">›</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function DistributionBar({
  dist,
}: {
  dist: Record<Severity, number>;
}) {
  const order: Severity[] = ["Low", "Medium", "High", "Critical"];
  return (
    <div className="mt-4">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
        {order.map((s) => {
          const tone = SEVERITY_TONE[s];
          const p = (dist[s] || 0) * 100;
          if (p < 0.5) return null;
          return (
            <div
              key={s}
              className={tone.dot}
              style={{ width: `${p}%` }}
              title={`${s} ${p.toFixed(0)}%`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-ink-400">
        {order.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className={"h-1.5 w-1.5 rounded-full " + SEVERITY_TONE[s].dot}
            />
            <span>{s}</span>
            <span className="font-mono text-ink-300">
              {Math.round((dist[s] || 0) * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass = "text-ink-200",
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-3">
      <div className="text-[10px] uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <div className={"mt-1 font-mono text-xl font-semibold " + valueClass}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-ink-400">{sub}</div>}
    </div>
  );
}

function PlanTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "warn" | "ok";
}) {
  const cls =
    tone === "warn"
      ? "text-warn-400"
      : tone === "ok"
        ? "text-accent-400"
        : "text-ink-200";
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <div className={"mt-0.5 font-mono text-lg font-semibold " + cls}>
        {value}
      </div>
    </div>
  );
}

function SeverityPulse({ tone }: { tone: string }) {
  return (
    <div className="relative h-12 w-12">
      <span
        className={"absolute inset-0 animate-ping rounded-full opacity-40 " + tone}
      />
      <span
        className={"absolute inset-2 rounded-full " + tone}
      />
    </div>
  );
}

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={
        "animate-pulse rounded-md bg-gradient-to-r from-ink-800 via-ink-700 to-ink-800 " +
        className
      }
    />
  );
}
