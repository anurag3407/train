"""Feature engineering shared between training and inference.

Keeps the schema in one place so the FastAPI service produces feature rows
identical to what the model saw during training.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd

EVENT_TYPES = ["planned", "unplanned"]
EVENT_CAUSES = [
    "vehicle_breakdown",
    "others",
    "pot_holes",
    "construction",
    "water_logging",
    "accident",
    "tree_fall",
    "road_conditions",
    "congestion",
    "public_event",
    "procession",
    "vip_movement",
    "protest",
    "debris",
    "fog_low_visibility",
    "test_demo",
]

PRIORITIES = ["High", "Low"]

# Bengaluru bounding box used for the dataset (kept loose for safety).
LAT_MIN, LAT_MAX = 12.70, 13.40
LON_MIN, LON_MAX = 77.20, 77.85
LAT_C = (LAT_MIN + LAT_MAX) / 2
LON_C = (LON_MIN + LON_MAX) / 2

NUMERIC_FEATURES = [
    "hour",
    "dow",
    "is_weekend",
    "is_morning_peak",
    "is_evening_peak",
    "is_night",
    "month",
    "lat",
    "lon",
    "lat_off",
    "lon_off",
    "dist_from_center_km",
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "corridor_event_rate",
    "junction_event_rate",
    "cause_avg_duration",
]

CATEGORICAL_FEATURES = [
    "event_type",
    "event_cause",
    "priority",
    "corridor",
    "zone",
    "gba_identifier",
    "police_station",
    "veh_type",
]


def canon_cause(value: str | float | None) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "others"
    s = str(value).strip().lower().replace(" ", "_").replace("/", "_")
    s = s.replace("__", "_")
    if s in {"debris"}:
        return "debris"
    if s in {"fog_low_visibility", "fog_-_low_visibility"}:
        return "fog_low_visibility"
    return s if s in EVENT_CAUSES else "others"


def canon_event_type(value: str | float | None) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "unplanned"
    s = str(value).strip().lower()
    return s if s in EVENT_TYPES else "unplanned"


def canon_priority(value: str | float | None) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "Low"
    s = str(value).strip().capitalize()
    return s if s in PRIORITIES else "Low"


def _safe_str(value) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "unknown"
    s = str(value).strip()
    return s if s else "unknown"


@dataclass
class CorpusStats:
    """History-derived aggregates exposed at inference time."""

    corridor_rate: dict[str, float]
    junction_rate: dict[str, float]
    cause_avg_duration: dict[str, float]
    global_corridor_rate: float
    global_junction_rate: float
    global_cause_duration: float

    def lookup_corridor(self, corridor: str) -> float:
        return self.corridor_rate.get(corridor, self.global_corridor_rate)

    def lookup_junction(self, junction: str) -> float:
        return self.junction_rate.get(junction, self.global_junction_rate)

    def lookup_cause(self, cause: str) -> float:
        return self.cause_avg_duration.get(cause, self.global_cause_duration)


def build_corpus_stats(df: pd.DataFrame) -> CorpusStats:
    """Compute per-corridor / per-junction event frequency and per-cause mean duration."""
    n = len(df)
    corridor_counts = df["corridor"].fillna("unknown").value_counts()
    junction_counts = df["junction"].fillna("unknown").value_counts()

    corridor_rate = (corridor_counts / max(n, 1)).to_dict()
    junction_rate = (junction_counts / max(n, 1)).to_dict()

    cause_dur = (
        df.dropna(subset=["duration_minutes"])
        .groupby("event_cause_canon")["duration_minutes"]
        .median()
        .to_dict()
    )
    global_cause_dur = float(df["duration_minutes"].median(skipna=True) or 60.0)

    return CorpusStats(
        corridor_rate=corridor_rate,
        junction_rate=junction_rate,
        cause_avg_duration=cause_dur,
        global_corridor_rate=float(corridor_rate.get("Non-corridor", 0.01)),
        global_junction_rate=float(np.median(list(junction_rate.values()) or [0.001])),
        global_cause_duration=global_cause_dur,
    )


def _is_peak(hour: int, lo: int, hi: int) -> int:
    return int(lo <= hour <= hi)


def featurize(
    rows: Iterable[dict],
    stats: CorpusStats,
) -> pd.DataFrame:
    """Convert a list of raw event dicts into the engineered feature frame."""
    records = []
    for r in rows:
        cause = canon_cause(r.get("event_cause"))
        etype = canon_event_type(r.get("event_type"))
        prio = canon_priority(r.get("priority"))
        corridor = _safe_str(r.get("corridor"))
        zone = _safe_str(r.get("zone"))
        gba = _safe_str(r.get("gba_identifier"))
        police = _safe_str(r.get("police_station"))
        veh = _safe_str(r.get("veh_type"))
        junction = _safe_str(r.get("junction"))

        ts = pd.to_datetime(r.get("start_datetime"), errors="coerce", utc=True)
        if pd.isna(ts):
            ts = pd.Timestamp.utcnow()
        hour = int(ts.hour)
        dow = int(ts.dayofweek)
        month = int(ts.month)

        lat = float(r.get("latitude") or LAT_C)
        lon = float(r.get("longitude") or LON_C)
        # Clip wild values to the city bbox so the model never sees zeros.
        if not (LAT_MIN <= lat <= LAT_MAX):
            lat = LAT_C
        if not (LON_MIN <= lon <= LON_MAX):
            lon = LON_C
        lat_off = lat - LAT_C
        lon_off = lon - LON_C
        dist_km = math.hypot(lat_off * 111.0, lon_off * 111.0 * math.cos(math.radians(LAT_C)))

        rec = {
            "event_type": etype,
            "event_cause": cause,
            "priority": prio,
            "corridor": corridor,
            "zone": zone,
            "gba_identifier": gba,
            "police_station": police,
            "veh_type": veh,
            "hour": hour,
            "dow": dow,
            "is_weekend": int(dow >= 5),
            "is_morning_peak": _is_peak(hour, 4, 9),
            "is_evening_peak": _is_peak(hour, 18, 22),
            "is_night": int(hour <= 5 or hour >= 23),
            "month": month,
            "lat": lat,
            "lon": lon,
            "lat_off": lat_off,
            "lon_off": lon_off,
            "dist_from_center_km": dist_km,
            "hour_sin": math.sin(2 * math.pi * hour / 24),
            "hour_cos": math.cos(2 * math.pi * hour / 24),
            "dow_sin": math.sin(2 * math.pi * dow / 7),
            "dow_cos": math.cos(2 * math.pi * dow / 7),
            "corridor_event_rate": stats.lookup_corridor(corridor),
            "junction_event_rate": stats.lookup_junction(junction),
            "cause_avg_duration": stats.lookup_cause(cause),
        }
        records.append(rec)
    return pd.DataFrame.from_records(records)


def derive_severity(duration_min: float, road_closure: bool, priority: str) -> str:
    """Map (duration, closure, priority) to a 4-level severity class.

    Used both for the training label and as a fallback when the classifier
    is uncertain at inference time.
    """
    if duration_min is None or (isinstance(duration_min, float) and math.isnan(duration_min)):
        duration_min = 60.0
    closure = bool(road_closure)
    if duration_min >= 1440 or (closure and duration_min >= 240):
        return "Critical"
    if duration_min >= 240 or closure:
        return "High"
    if duration_min >= 60 or priority == "High":
        return "Medium"
    return "Low"


SEVERITY_ORDER = ["Low", "Medium", "High", "Critical"]
