import type {
  HealthResponse,
  Hotspot,
  Metadata,
  PredictRequest,
  PredictResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  const url = new URL(path, API_BASE);
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  metadata: () => request<Metadata>("/metadata"),
  predict: (body: PredictRequest) =>
    request<PredictResponse>("/predict", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  hotspots: (params: {
    hour: number;
    corridor?: string;
    zone?: string;
    top?: number;
    min_events?: number;
  }) =>
    request<Hotspot[]>("/hotspots", {
      query: {
        hour: params.hour,
        corridor: params.corridor,
        zone: params.zone,
        top: params.top ?? 25,
        min_events: params.min_events ?? 2,
      },
    }),
};

export { API_BASE };
