"""FastAPI service: event-driven congestion forecaster + resource recommender.

Endpoints
---------
- GET  /health         : liveness + model metadata
- POST /predict        : single event impact + resource plan
- POST /predict/batch  : list of events
- GET  /hotspots       : top-N risky junctions for a given hour/corridor/zone
- GET  /metadata       : enums available to the UI (causes, corridors, ...)
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = Path(os.getenv("MODEL_DIR", ROOT / "models"))

import sys
sys.path.insert(0, str(ROOT / "src"))

from features import (  # noqa: E402
    CATEGORICAL_FEATURES,
    EVENT_CAUSES,
    EVENT_TYPES,
    LAT_C,
    LAT_MAX,
    LAT_MIN,
    LON_C,
    LON_MAX,
    LON_MIN,
    NUMERIC_FEATURES,
    PRIORITIES,
    SEVERITY_ORDER,
    canon_cause,
    canon_event_type,
    canon_priority,
    derive_severity,
    featurize,
)
from recommender import recommend  # noqa: E402


# ---------------------------------------------------------------------------
# Artifact loading
# ---------------------------------------------------------------------------

def _require(path: Path):
    if not path.exists():
        raise RuntimeError(
            f"Missing artifact: {path}. Run `python src/train.py` first."
        )
    return joblib.load(path)


corpus_stats = _require(MODEL_DIR / "corpus_stats.joblib")
duration_model = _require(MODEL_DIR / "duration_model.joblib")
closure_model = _require(MODEL_DIR / "closure_model.joblib")
severity_model = _require(MODEL_DIR / "severity_model.joblib")

hotspots_path = MODEL_DIR / "hotspots.parquet"
hotspots_df: pd.DataFrame | None = (
    pd.read_parquet(hotspots_path) if hotspots_path.exists() else None
)

metrics_path = MODEL_DIR / "metrics.json"
metrics: dict[str, Any] = (
    json.loads(metrics_path.read_text()) if metrics_path.exists() else {}
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class EventRequest(BaseModel):
    event_type: str = Field("unplanned", description="planned | unplanned")
    event_cause: str = Field(..., description="e.g. construction, public_event, accident")
    priority: str = Field("Low", description="High | Low")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    corridor: Optional[str] = Field(None, description="e.g. ORR East 1, Mysore Road, Non-corridor")
    zone: Optional[str] = None
    gba_identifier: Optional[str] = None
    police_station: Optional[str] = None
    junction: Optional[str] = None
    veh_type: Optional[str] = None
    start_datetime: Optional[datetime] = Field(
        None, description="ISO-8601 UTC. Defaults to now."
    )

    @field_validator("event_type")
    @classmethod
    def _ev(cls, v: str) -> str:
        return canon_event_type(v)

    @field_validator("event_cause")
    @classmethod
    def _ec(cls, v: str) -> str:
        return canon_cause(v)

    @field_validator("priority")
    @classmethod
    def _pr(cls, v: str) -> str:
        return canon_priority(v)


class PredictionResponse(BaseModel):
    severity: str
    severity_confidence: float
    severity_distribution: dict[str, float]
    predicted_duration_minutes: float
    predicted_duration_human: str
    road_closure_probability: float
    likely_road_closure: bool
    resource_plan: dict[str, Any]
    rule_severity_fallback: str
    model_metrics_snapshot: dict[str, Any]


class BatchEventRequest(BaseModel):
    events: list[EventRequest]


class HotspotEntry(BaseModel):
    corridor: str
    junction: str
    zone: str
    hour: int
    event_count: int
    avg_duration_min: float
    closure_rate: float
    high_priority_rate: float
    top_cause: str
    lat: Optional[float]
    lon: Optional[float]


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------


def _humanise_minutes(m: float) -> str:
    m = max(0.0, float(m))
    if m < 60:
        return f"{m:.0f} min"
    if m < 60 * 24:
        h = m / 60.0
        return f"{h:.1f} h"
    d = m / (60.0 * 24.0)
    return f"{d:.1f} d"


def _validate_geo(lat: float, lon: float) -> None:
    # Bengaluru dataset coverage. We allow predictions anywhere but warn the caller
    # by raising 422 if the coords are clearly outside the supported bbox — the
    # frequency tables would be uninformative.
    if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Coordinates outside supported Bengaluru bbox "
                f"(lat {LAT_MIN}-{LAT_MAX}, lon {LON_MIN}-{LON_MAX})."
            ),
        )


def _predict_single(req: EventRequest) -> PredictionResponse:
    _validate_geo(req.latitude, req.longitude)

    raw = {
        "event_type": req.event_type,
        "event_cause": req.event_cause,
        "priority": req.priority,
        "corridor": req.corridor or "Non-corridor",
        "zone": req.zone,
        "gba_identifier": req.gba_identifier,
        "police_station": req.police_station,
        "junction": req.junction,
        "veh_type": req.veh_type,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "start_datetime": req.start_datetime or datetime.now(timezone.utc),
    }
    X = featurize([raw], corpus_stats)
    # Ensure column ordering matches what the pipeline expects.
    X = X[CATEGORICAL_FEATURES + NUMERIC_FEATURES]

    # Duration (log1p minutes -> minutes).
    log_min = float(duration_model.predict(X)[0])
    duration_min = float(np.expm1(log_min))
    duration_min = max(1.0, duration_min)

    # Closure probability.
    closure_prob = float(closure_model.predict_proba(X)[0, 1])

    # Severity classifier.
    sev_probs = severity_model.predict_proba(X)[0]
    sev_idx = int(np.argmax(sev_probs))
    severity = SEVERITY_ORDER[sev_idx]
    sev_distribution = {SEVERITY_ORDER[i]: float(sev_probs[i]) for i in range(len(SEVERITY_ORDER))}
    sev_conf = float(sev_probs[sev_idx])

    # Rule-based severity as audit fallback.
    rule_sev = derive_severity(duration_min, closure_prob >= 0.5, req.priority)

    plan = recommend(
        severity=severity,
        cause=req.event_cause,
        corridor=raw["corridor"],
        closure_prob=closure_prob,
        predicted_duration_min=duration_min,
    )

    return PredictionResponse(
        severity=severity,
        severity_confidence=round(sev_conf, 3),
        severity_distribution={k: round(v, 3) for k, v in sev_distribution.items()},
        predicted_duration_minutes=round(duration_min, 1),
        predicted_duration_human=_humanise_minutes(duration_min),
        road_closure_probability=round(closure_prob, 3),
        likely_road_closure=closure_prob >= 0.5,
        resource_plan=plan.to_dict(),
        rule_severity_fallback=rule_sev,
        model_metrics_snapshot=metrics,
    )


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Astram Event-Driven Congestion API",
    version="1.0.0",
    description=(
        "Forecasts traffic impact of planned & unplanned events and recommends "
        "manpower, barricading, and diversion plans. Trained on the Bengaluru "
        "Astram event ledger."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_dir": str(MODEL_DIR),
        "models_loaded": {
            "duration": True,
            "closure": True,
            "severity": True,
        },
        "hotspots_rows": int(len(hotspots_df)) if hotspots_df is not None else 0,
        "metrics": metrics,
    }


@app.get("/metadata")
def metadata() -> dict[str, Any]:
    corridors = sorted(corpus_stats.corridor_rate.keys())
    return {
        "event_types": EVENT_TYPES,
        "event_causes": EVENT_CAUSES,
        "priorities": PRIORITIES,
        "severity_classes": SEVERITY_ORDER,
        "corridors": corridors,
        "bbox": {
            "lat_min": LAT_MIN, "lat_max": LAT_MAX,
            "lon_min": LON_MIN, "lon_max": LON_MAX,
            "center": {"lat": LAT_C, "lon": LON_C},
        },
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(req: EventRequest) -> PredictionResponse:
    return _predict_single(req)


@app.post("/predict/batch")
def predict_batch(req: BatchEventRequest) -> dict[str, Any]:
    if not req.events:
        raise HTTPException(status_code=400, detail="events list is empty")
    if len(req.events) > 500:
        raise HTTPException(status_code=400, detail="max 500 events per request")
    out = [_predict_single(e).model_dump() for e in req.events]
    return {"count": len(out), "results": out}


@app.get("/hotspots", response_model=list[HotspotEntry])
def hotspots(
    hour: int = Query(..., ge=0, le=23, description="Hour-of-day 0-23 (local-ish)"),
    corridor: Optional[str] = Query(None, description="Filter by corridor"),
    zone: Optional[str] = Query(None, description="Filter by zone"),
    top: int = Query(20, ge=1, le=200),
    min_events: int = Query(2, ge=1, description="Drop junctions with too few historical events"),
) -> list[HotspotEntry]:
    if hotspots_df is None:
        raise HTTPException(status_code=503, detail="hotspots table not available")

    df = hotspots_df[hotspots_df["hour"] == hour]
    if corridor:
        df = df[df["corridor"] == corridor]
    if zone:
        df = df[df["zone"] == zone]
    df = df[df["event_count"] >= min_events]
    df = df.sort_values(
        ["event_count", "avg_duration_min", "closure_rate"],
        ascending=[False, False, False],
    ).head(top)

    rows: list[HotspotEntry] = []
    for _, r in df.iterrows():
        rows.append(
            HotspotEntry(
                corridor=str(r["corridor"]),
                junction=str(r["junction"]),
                zone=str(r["zone"]),
                hour=int(r["hour"]),
                event_count=int(r["event_count"]),
                avg_duration_min=float(r["avg_duration_min"]),
                closure_rate=float(r["closure_rate"]),
                high_priority_rate=float(r["high_priority_rate"]),
                top_cause=str(r["top_cause"]),
                lat=None if pd.isna(r["lat"]) else float(r["lat"]),
                lon=None if pd.isna(r["lon"]) else float(r["lon"]),
            )
        )
    return rows


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "Astram Event-Driven Congestion API",
        "docs": "/docs",
        "endpoints": "/health, /metadata, /predict, /predict/batch, /hotspots",
    }
