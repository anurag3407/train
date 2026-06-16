"""Train three models on the Astram event ledger.

1. Duration regressor   : log-minutes (HistGradientBoostingRegressor)
2. Road-closure classifier (HistGradientBoostingClassifier, binary)
3. Severity classifier  : 4-class (Low/Medium/High/Critical)

Also computes:
- CorpusStats (frequency lookups used at inference)
- Hotspot table (corridor x hour event counts) for /hotspots endpoint
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from features import (  # noqa: E402
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    SEVERITY_ORDER,
    build_corpus_stats,
    canon_cause,
    canon_event_type,
    canon_priority,
    derive_severity,
    featurize,
)


def load_raw(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path, low_memory=False)
    df["start_datetime"] = pd.to_datetime(df["start_datetime"], errors="coerce", utc=True)
    df["resolved_datetime"] = pd.to_datetime(df["resolved_datetime"], errors="coerce", utc=True)
    df["closed_datetime"] = pd.to_datetime(df["closed_datetime"], errors="coerce", utc=True)
    df["end_datetime"] = pd.to_datetime(df["end_datetime"], errors="coerce", utc=True)

    end = df["resolved_datetime"].fillna(df["closed_datetime"]).fillna(df["end_datetime"])
    duration = (end - df["start_datetime"]).dt.total_seconds() / 60.0

    # Discard nonsensical negative or extreme durations. >= 30 days = probably
    # ticket never closed; not a learnable signal for traffic ops.
    duration = duration.where(duration.between(1, 60 * 24 * 30))
    df["duration_minutes"] = duration

    df["event_cause_canon"] = df["event_cause"].apply(canon_cause)
    df["event_type_canon"] = df["event_type"].apply(canon_event_type)
    df["priority_canon"] = df["priority"].apply(canon_priority)

    df["requires_road_closure"] = df["requires_road_closure"].fillna(False)
    # CSV stores "True"/"False" strings.
    if df["requires_road_closure"].dtype == object:
        df["requires_road_closure"] = df["requires_road_closure"].astype(str).str.lower().eq("true")

    return df


def to_feature_rows(df: pd.DataFrame) -> list[dict]:
    rows = []
    for _, r in df.iterrows():
        rows.append(
            {
                "event_type": r["event_type_canon"],
                "event_cause": r["event_cause_canon"],
                "priority": r["priority_canon"],
                "corridor": r.get("corridor"),
                "zone": r.get("zone"),
                "gba_identifier": r.get("gba_identifier"),
                "police_station": r.get("police_station"),
                "veh_type": r.get("veh_type"),
                "junction": r.get("junction"),
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude"),
                "start_datetime": r.get("start_datetime"),
            }
        )
    return rows


def build_pipeline(model) -> Pipeline:
    pre = ColumnTransformer(
        transformers=[
            (
                "cat",
                OrdinalEncoder(
                    handle_unknown="use_encoded_value",
                    unknown_value=-1,
                    encoded_missing_value=-1,
                ),
                CATEGORICAL_FEATURES,
            ),
            ("num", "passthrough", NUMERIC_FEATURES),
        ],
        remainder="drop",
    )
    return Pipeline([("pre", pre), ("model", model)])


def build_hotspot_table(df: pd.DataFrame) -> pd.DataFrame:
    h = df.dropna(subset=["start_datetime"]).copy()
    h["hour"] = h["start_datetime"].dt.hour
    h["dow"] = h["start_datetime"].dt.dayofweek
    h["corridor"] = h["corridor"].fillna("Non-corridor")
    h["junction"] = h["junction"].fillna("unknown")
    h["zone"] = h["zone"].fillna("unknown")

    grouped = (
        h.groupby(["corridor", "junction", "zone", "hour"])
        .agg(
            event_count=("id", "count"),
            avg_duration_min=("duration_minutes", "mean"),
            closure_rate=("requires_road_closure", "mean"),
            high_priority_rate=("priority_canon", lambda s: (s == "High").mean()),
            top_cause=("event_cause_canon", lambda s: s.value_counts().index[0]),
            lat=("latitude", "median"),
            lon=("longitude", "median"),
        )
        .reset_index()
    )
    grouped["avg_duration_min"] = grouped["avg_duration_min"].fillna(60.0).round(1)
    grouped["closure_rate"] = grouped["closure_rate"].round(3)
    grouped["high_priority_rate"] = grouped["high_priority_rate"].round(3)
    return grouped


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "data/events.csv"))
    ap.add_argument("--out", default=str(ROOT / "models"))
    ap.add_argument("--test-size", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/6] Loading {args.data}")
    df = load_raw(Path(args.data))
    print(f"      rows={len(df)}  cols={df.shape[1]}")

    stats = build_corpus_stats(df)
    joblib.dump(stats, out_dir / "corpus_stats.joblib")

    print("[2/6] Featurizing")
    raw_rows = to_feature_rows(df)
    X = featurize(raw_rows, stats)

    # ---- Target A: duration regressor (log1p minutes) -----------------------
    mask_dur = df["duration_minutes"].notna()
    Xd = X[mask_dur].reset_index(drop=True)
    yd = np.log1p(df.loc[mask_dur, "duration_minutes"].to_numpy())

    Xd_tr, Xd_te, yd_tr, yd_te = train_test_split(
        Xd, yd, test_size=args.test_size, random_state=args.seed
    )
    dur_pipe = build_pipeline(
        HistGradientBoostingRegressor(max_depth=8, max_iter=400, learning_rate=0.05, random_state=args.seed)
    )
    print(f"[3/6] Training duration regressor  (n={len(Xd_tr)})")
    dur_pipe.fit(Xd_tr, yd_tr)
    yd_pred = dur_pipe.predict(Xd_te)
    mae_log = mean_absolute_error(yd_te, yd_pred)
    r2 = r2_score(yd_te, yd_pred)
    # MAE in actual minutes (geometric-ish since predicted in log space)
    mae_min = float(np.mean(np.abs(np.expm1(yd_pred) - np.expm1(yd_te))))
    median_ae_min = float(np.median(np.abs(np.expm1(yd_pred) - np.expm1(yd_te))))
    print(f"      duration  MAE(log1p)={mae_log:.3f}  R2={r2:.3f}  MAE(min)={mae_min:.1f}  median|err|={median_ae_min:.1f}")

    joblib.dump(dur_pipe, out_dir / "duration_model.joblib")

    # ---- Target B: road-closure binary classifier --------------------------
    yc = df["requires_road_closure"].astype(int).to_numpy()
    Xc_tr, Xc_te, yc_tr, yc_te = train_test_split(
        X, yc, test_size=args.test_size, random_state=args.seed, stratify=yc
    )
    closure_pipe = build_pipeline(
        HistGradientBoostingClassifier(
            max_depth=6, max_iter=400, learning_rate=0.05,
            class_weight="balanced", random_state=args.seed,
        )
    )
    print(f"[4/6] Training road-closure classifier (n={len(Xc_tr)})")
    closure_pipe.fit(Xc_tr, yc_tr)
    yc_prob = closure_pipe.predict_proba(Xc_te)[:, 1]
    yc_pred = (yc_prob >= 0.5).astype(int)
    auc = roc_auc_score(yc_te, yc_prob)
    f1 = f1_score(yc_te, yc_pred)
    acc = accuracy_score(yc_te, yc_pred)
    print(f"      closure   AUC={auc:.3f}  F1={f1:.3f}  Acc={acc:.3f}")
    joblib.dump(closure_pipe, out_dir / "closure_model.joblib")

    # ---- Target C: severity classifier -------------------------------------
    # Build labels from history. Rows w/o duration get 'Medium' as a safe default
    # but we drop them from training to avoid label noise.
    sev_mask = df["duration_minutes"].notna()
    sev_labels = [
        derive_severity(d, c, p)
        for d, c, p in zip(
            df.loc[sev_mask, "duration_minutes"],
            df.loc[sev_mask, "requires_road_closure"].astype(bool),
            df.loc[sev_mask, "priority_canon"],
        )
    ]
    label_to_idx = {lab: i for i, lab in enumerate(SEVERITY_ORDER)}
    ys = np.array([label_to_idx[l] for l in sev_labels])
    Xs = X[sev_mask].reset_index(drop=True)

    Xs_tr, Xs_te, ys_tr, ys_te = train_test_split(
        Xs, ys, test_size=args.test_size, random_state=args.seed, stratify=ys
    )
    sev_pipe = build_pipeline(
        HistGradientBoostingClassifier(
            max_depth=8, max_iter=500, learning_rate=0.05,
            class_weight="balanced", random_state=args.seed,
        )
    )
    print(f"[5/6] Training severity classifier (n={len(Xs_tr)})")
    sev_pipe.fit(Xs_tr, ys_tr)
    ys_pred = sev_pipe.predict(Xs_te)
    sev_acc = accuracy_score(ys_te, ys_pred)
    sev_f1 = f1_score(ys_te, ys_pred, average="weighted")
    print(f"      severity  Acc={sev_acc:.3f}  F1(weighted)={sev_f1:.3f}")
    print(classification_report(ys_te, ys_pred, target_names=SEVERITY_ORDER, zero_division=0))
    joblib.dump(sev_pipe, out_dir / "severity_model.joblib")

    # ---- Hotspot table ------------------------------------------------------
    print("[6/6] Building hotspot table")
    hot = build_hotspot_table(df)
    hot.to_parquet(out_dir / "hotspots.parquet", index=False)
    print(f"      hotspots rows={len(hot)}")

    metrics = {
        "duration": {"mae_log1p": mae_log, "r2": r2, "mae_min": mae_min, "median_ae_min": median_ae_min},
        "closure": {"auc": auc, "f1": f1, "accuracy": acc},
        "severity": {"accuracy": sev_acc, "f1_weighted": sev_f1},
        "n_rows": int(len(df)),
        "n_duration_rows": int(mask_dur.sum()),
    }
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print("\nSaved artifacts to", out_dir)


if __name__ == "__main__":
    main()
