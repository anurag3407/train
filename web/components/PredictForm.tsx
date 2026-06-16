"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EventType,
  Metadata,
  PredictRequest,
  Priority,
} from "@/lib/types";
import { prettifyCause } from "@/lib/ui";

interface PredictFormProps {
  metadata: Metadata | null;
  lat: number;
  lon: number;
  loading: boolean;
  onSubmit: (req: PredictRequest) => void;
}

const VEHICLE_TYPES = [
  "lcv",
  "heavy_vehicle",
  "two_wheeler",
  "car",
  "auto",
  "bus",
  "truck",
];

function nowLocalIso(): string {
  const d = new Date();
  // datetime-local input needs YYYY-MM-DDTHH:mm, local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToUtcIso(local: string): string {
  // datetime-local is local time; convert to UTC ISO for the API.
  const d = new Date(local);
  return d.toISOString();
}

export default function PredictForm(props: PredictFormProps) {
  const { metadata, lat, lon, loading, onSubmit } = props;

  const [eventType, setEventType] = useState<EventType>("unplanned");
  const [cause, setCause] = useState<string>("accident");
  const [priority, setPriority] = useState<Priority>("High");
  const [corridor, setCorridor] = useState<string>("Non-corridor");
  const [vehType, setVehType] = useState<string>("");
  const [policeStation, setPoliceStation] = useState<string>("");
  const [junction, setJunction] = useState<string>("");
  const [startLocal, setStartLocal] = useState<string>(nowLocalIso());

  useEffect(() => {
    if (!metadata) return;
    if (metadata.event_causes.length && !metadata.event_causes.includes(cause)) {
      setCause(metadata.event_causes[0]);
    }
    if (metadata.corridors.length && !metadata.corridors.includes(corridor)) {
      setCorridor(metadata.corridors[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata]);

  const corridorOptions = useMemo(
    () => metadata?.corridors ?? ["Non-corridor"],
    [metadata],
  );
  const causeOptions = useMemo(
    () => metadata?.event_causes ?? ["accident"],
    [metadata],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body: PredictRequest = {
      event_type: eventType,
      event_cause: cause,
      priority,
      latitude: lat,
      longitude: lon,
      corridor: corridor || null,
      veh_type: vehType || null,
      police_station: policeStation || null,
      junction: junction || null,
      start_datetime: startLocal ? localToUtcIso(startLocal) : null,
    };
    onSubmit(body);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section label="Event">
        <div className="grid grid-cols-2 gap-2">
          <Segment
            value={eventType}
            onChange={(v) => setEventType(v as EventType)}
            options={[
              { value: "unplanned", label: "Unplanned" },
              { value: "planned", label: "Planned" },
            ]}
          />
          <Segment
            value={priority}
            onChange={(v) => setPriority(v as Priority)}
            options={[
              { value: "High", label: "Hi-Prio" },
              { value: "Low", label: "Lo-Prio" },
            ]}
          />
        </div>
        <Select
          label="Cause"
          value={cause}
          onChange={setCause}
          options={causeOptions.map((c) => ({
            value: c,
            label: prettifyCause(c),
          }))}
        />
      </Section>

      <Section label="Location">
        <div className="grid grid-cols-2 gap-2">
          <Readonly label="Lat" value={lat.toFixed(5)} />
          <Readonly label="Lon" value={lon.toFixed(5)} />
        </div>
        <Select
          label="Corridor"
          value={corridor}
          onChange={setCorridor}
          options={corridorOptions.map((c) => ({ value: c, label: c }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Police station"
            value={policeStation}
            onChange={setPoliceStation}
            placeholder="optional"
          />
          <Input
            label="Junction"
            value={junction}
            onChange={setJunction}
            placeholder="optional"
          />
        </div>
      </Section>

      <Section label="Context">
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Vehicle type"
            value={vehType}
            onChange={setVehType}
            options={[
              { value: "", label: "—" },
              ...VEHICLE_TYPES.map((v) => ({ value: v, label: v })),
            ]}
          />
          <DateInput
            label="Start time"
            value={startLocal}
            onChange={setStartLocal}
          />
        </div>
      </Section>

      <button
        type="submit"
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-xl border border-accent-500/40 bg-accent-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-400 transition hover:bg-accent-500/20 hover:shadow-glow disabled:opacity-60"
      >
        <span className="relative z-10">
          {loading ? "Forecasting…" : "Forecast impact"}
        </span>
        <span className="absolute inset-x-0 bottom-0 h-px glow-line opacity-0 transition group-hover:opacity-100" />
      </button>

      <p className="text-[11px] leading-relaxed text-ink-400">
        Click on the map to relocate the event. Coordinates auto-update.
      </p>
    </form>
  );
}

/* ---------------- field primitives ---------------- */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[10px] uppercase tracking-[0.25em] text-ink-400">
        {label}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-ink-700 text-[11px] uppercase tracking-wider">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={
              "px-2 py-2 transition " +
              (active
                ? "bg-accent-500/20 text-accent-400"
                : "bg-ink-900 text-ink-300 hover:bg-ink-800")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 pr-8 text-sm text-ink-200 outline-none transition focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
          ▾
        </span>
      </div>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200 placeholder:text-ink-500 outline-none transition focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
      />
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 font-mono text-xs text-accent-400">
        {value}
      </div>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200 outline-none transition focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
      />
    </label>
  );
}
