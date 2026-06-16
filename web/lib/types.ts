export type EventType = "planned" | "unplanned";
export type Priority = "High" | "Low";
export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface PredictRequest {
  event_type: EventType;
  event_cause: string;
  priority: Priority;
  latitude: number;
  longitude: number;
  corridor?: string | null;
  zone?: string | null;
  gba_identifier?: string | null;
  police_station?: string | null;
  junction?: string | null;
  veh_type?: string | null;
  start_datetime?: string | null;
}

export interface ResourcePlan {
  manpower_count: number;
  barricades_count: number;
  needs_diversion: boolean;
  diversion_plan: string;
  suggested_units: string[];
  notes: string[];
}

export interface PredictResponse {
  severity: Severity;
  severity_confidence: number;
  severity_distribution: Record<Severity, number>;
  predicted_duration_minutes: number;
  predicted_duration_human: string;
  road_closure_probability: number;
  likely_road_closure: boolean;
  resource_plan: ResourcePlan;
  rule_severity_fallback: Severity;
  model_metrics_snapshot: Record<string, unknown>;
}

export interface Hotspot {
  corridor: string;
  junction: string;
  zone: string;
  hour: number;
  event_count: number;
  avg_duration_min: number;
  closure_rate: number;
  high_priority_rate: number;
  top_cause: string;
  lat: number | null;
  lon: number | null;
}

export interface Metadata {
  event_types: EventType[];
  event_causes: string[];
  priorities: Priority[];
  severity_classes: Severity[];
  corridors: string[];
  bbox: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
    center: { lat: number; lon: number };
  };
}

export interface HealthResponse {
  status: string;
  hotspots_rows: number;
  metrics: Record<string, unknown>;
}
