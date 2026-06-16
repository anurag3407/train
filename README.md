# Astram Event-Driven Congestion Forecaster

Forecasts traffic impact of **planned & unplanned events** in Bengaluru and recommends **manpower, barricading, and diversion plans**. Trained on the Astram event ledger (8,173 incidents, Nov-2023 → Apr-2024) and served over FastAPI.

## Problem statement → solution mapping

| PS challenge                              | This service                                                  |
| ----------------------------------------- | ------------------------------------------------------------- |
| Impact not quantified in advance          | `severity` + `duration` + `closure-probability` ML predictions |
| Resource deployment is experience-driven  | Rule-based `resource_plan` derived from ML severity            |
| No post-event learning system             | Models retrain from the same ledger; `/hotspots` exposes history|

## Architecture

```
                  CSV ledger
                     │
                     ▼
            ┌──────────────────┐
            │  train.py        │  feature engineering + 3 models
            └──────────────────┘
                     │
        models/  duration_model.joblib    (HistGradientBoostingRegressor, log-min)
                 closure_model.joblib     (HistGradientBoostingClassifier, binary)
                 severity_model.joblib    (HistGradientBoostingClassifier, 4-class)
                 corpus_stats.joblib      (corridor/junction frequency + cause duration)
                 hotspots.parquet         (corridor×junction×hour aggregate)
                 metrics.json
                     │
                     ▼
            ┌──────────────────┐
            │  api.py (FastAPI)│  /predict  /predict/batch  /hotspots  /metadata
            └──────────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ recommender.py   │  pure-rule manpower + barricade + diversion plan
            └──────────────────┘
```

Two-stage by design:

1. **ML stage** maps a candidate event to a quantitative impact (severity class, predicted duration in minutes, road-closure probability).
2. **Rules stage** maps that impact (plus cause + corridor) to a deployable response. Pure rules so ops can tune thresholds without retraining.

## Dataset findings

- **8,173** events. Bengaluru bbox lat 12.80–13.27, lon 77.31–77.77.
- **event_type** — 94% unplanned, 6% planned.
- **event_cause** (17 → 16 after canonicalisation) — vehicle_breakdown 60%, others 8%, pot_holes 7%, construction 6%, water_logging 6%, accident 4%. Planned skews to construction, public_event, procession, vip_movement, protest.
- **Duration** — median 67 min (unplanned), 255 min (planned). Heavy right tail (potholes / debris / water_logging stretch to days).
- **Road closure** — 8% of events.
- **Priority** — 62% High, 38% Low.
- **Time signal** — bimodal hourly: 4–7 am + 19–22 pm. DoW roughly flat.
- **High-noise columns** dropped: comment, meta_data, map_file, direction, route_path, age_of_truck, cargo_material, reason_breakdown, resolved_at_*, end_datetime.

## Targets

| Model     | Target                                      | Features                                                                                          |
| --------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| duration  | `log1p(duration_minutes)`                   | event_type, event_cause, priority, corridor, zone, gba, police_station, veh_type + hour, dow, peak flags, month, lat/lon, cyclical hour/dow, corridor/junction frequency, cause median duration |
| closure   | `requires_road_closure` (binary)            | same                                                                                              |
| severity  | 4-class `Low / Medium / High / Critical`    | same; label derived from duration + closure + priority                                            |

Severity label rule:

- `Critical` — duration ≥ 24 h, or (closure and duration ≥ 4 h)
- `High`     — duration ≥ 4 h or closure
- `Medium`   — duration ≥ 1 h or priority == High
- `Low`      — otherwise

## Held-out metrics (20% test split)

```json
{
  "duration":  {"R2": 0.42, "MAE(min)": 2252.4, "median_ae(min)": 52.8, "MAE(log1p)": 1.26},
  "closure":   {"AUC": 0.80, "F1": 0.45, "Accuracy": 0.89},
  "severity":  {"Accuracy": 0.71, "F1_weighted": 0.71}
}
```

The duration MAE in raw minutes is inflated by the long-tail outliers; the **median absolute error of ~53 min** is the more honest summary — the model is well-calibrated for typical events and uncertain on multi-day situations (the long tail is also where the dataset itself is sparsest).

## Setup

```bash
cd /Users/jarvis/train
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# data file lives at data/events.csv (symlinked to the supplied CSV)
ls data/events.csv

# train
python src/train.py

# serve
uvicorn src.api:app --host 0.0.0.0 --port 8000
# open http://localhost:8000/docs for the Swagger UI
```

## API

### `POST /predict`

```bash
curl -s -X POST http://localhost:8000/predict \
  -H 'content-type: application/json' \
  -d '{
    "event_type": "planned",
    "event_cause": "vip_movement",
    "priority": "High",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "corridor": "ORR East 1",
    "zone": "Central Zone 2",
    "police_station": "Cubbon Park",
    "junction": "TrinityCircle",
    "start_datetime": "2026-06-17T18:30:00Z"
  }'
```

Response (excerpt):

```json
{
  "severity": "Medium",
  "severity_confidence": 0.887,
  "predicted_duration_minutes": 56.2,
  "predicted_duration_human": "56 min",
  "road_closure_probability": 0.404,
  "likely_road_closure": false,
  "resource_plan": {
    "manpower_count": 13,
    "barricades_count": 14,
    "needs_diversion": true,
    "diversion_plan": "Pre-clear ORR East 1 of slow vehicles 30 min ahead of movement...",
    "suggested_units": ["Traffic Police constables", "Home Guard squad"],
    "notes": ["ORR East 1 is an arterial corridor; staffing bumped +2."]
  },
  "rule_severity_fallback": "Medium"
}
```

### `POST /predict/batch`

Same payload wrapped in `{"events":[…]}`. Max 500 per call.

### `GET /hotspots?hour=20&corridor=Hosur+Road&top=10`

Returns top-N risky junctions historically seen at that hour. Useful for proactive pre-positioning.

### `GET /metadata`

Returns enums (event causes, corridors, priorities, severity classes, supported bbox) so a UI can populate dropdowns.

### `GET /health`

Liveness + metrics snapshot from the last training run.

## File tree

```
.
├── data/
│   └── events.csv                       (symlink to supplied CSV)
├── models/                              (created by train.py)
│   ├── duration_model.joblib
│   ├── closure_model.joblib
│   ├── severity_model.joblib
│   ├── corpus_stats.joblib
│   ├── hotspots.parquet
│   └── metrics.json
├── src/
│   ├── features.py                      shared feature engineering
│   ├── recommender.py                   manpower + barricade + diversion rules
│   ├── train.py                         train the 3 models
│   └── api.py                           FastAPI service
├── requirements.txt
└── README.md
```

## Retraining cadence

Retrain weekly with the latest export from Astram:

```bash
cp /path/to/latest_events.csv data/events.csv
python src/train.py
# atomic swap by restarting the API process
```

The `/health` endpoint exposes `metrics` so you can monitor drift across retrains.

## Caveats & next steps

- Dataset is 5 months only. Seasonal effects (monsoon flooding spikes water_logging; festival season clusters processions) are under-represented. Re-evaluate severity thresholds once 12+ months of history are available.
- Junction names are free-text in the CSV (294 unique values). The hotspot table uses them verbatim — a junction-name normalisation pass would tighten the lookup.
- The duration regressor's long-tail error is the main quality gap. Two practical mitigations: (a) cap the label at a 95th-percentile floor before training; (b) train a separate "is this a multi-day event" gate and only use the regressor for short events. Left as future work to avoid over-engineering for the submission.
- For a real deployment, swap CORS `allow_origins=["*"]` for the operator dashboard origin and add an API key middleware.
