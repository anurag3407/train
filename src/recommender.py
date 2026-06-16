"""Rule-based resource recommender layered on top of the ML severity output.

Pure logic — no model — so ops can audit / tune thresholds without retraining.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


# Baseline manpower per severity tier. These are the count of traffic
# personnel that should be deployed before cause/corridor adjustments.
BASE_MANPOWER = {
    "Low": 1,
    "Medium": 3,
    "High": 6,
    "Critical": 12,
}

BASE_BARRICADES = {
    "Low": 0,
    "Medium": 2,
    "High": 6,
    "Critical": 12,
}

# Causes that systematically need more boots-on-ground regardless of duration.
CAUSE_MANPOWER_BOOST = {
    "vip_movement": 8,
    "procession": 6,
    "protest": 6,
    "public_event": 5,
    "construction": 2,
    "accident": 2,
    "water_logging": 2,
    "pot_holes": 1,
    "tree_fall": 2,
    "congestion": 2,
}

# Causes that almost always need barricading even when ML predicts no closure.
CAUSE_BARRICADE_BOOST = {
    "vip_movement": 10,
    "procession": 8,
    "protest": 6,
    "public_event": 6,
    "construction": 4,
    "tree_fall": 3,
    "water_logging": 3,
    "accident": 2,
}

# Corridors flagged as arterial. We bump manpower because a stalled arterial
# corridor cascades into adjacent corridors much faster than a non-corridor road.
ARTERIAL_CORRIDORS = {
    "ORR North 1", "ORR North 2", "ORR East 1", "ORR East 2",
    "ORR West 1", "ORR West 2", "ORR South 1", "ORR South 2",
    "Bellary Road 1", "Bellary Road 2", "Tumkur Road",
    "Mysore Road", "Hosur Road", "Old Madras Road",
    "Old Airport Road", "Magadi Road", "Bannerghata Road",
}

# Causes that genuinely require diverting traffic away from the spot.
DIVERSION_CAUSES = {
    "vip_movement", "procession", "protest", "public_event",
    "construction", "tree_fall", "water_logging", "accident",
    "pot_holes", "road_conditions",
}


@dataclass
class ResourcePlan:
    manpower_count: int
    barricades_count: int
    needs_diversion: bool
    diversion_plan: str
    suggested_units: list[str]
    notes: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _diversion_plan(cause: str, corridor: str, closure: bool, severity: str) -> str:
    if not closure and cause not in DIVERSION_CAUSES:
        return "No diversion required. Manage in-lane with manpower."
    if cause == "vip_movement":
        return (
            f"Pre-clear {corridor} of slow vehicles 30 min ahead of movement. "
            "Hold cross-traffic at signals 2 stops upstream and downstream during the convoy window."
        )
    if cause in {"procession", "protest", "public_event"}:
        return (
            f"Divert through-traffic on {corridor} to nearest parallel corridor. "
            "Publish advisory 60 min ahead. Keep one emergency lane reserved."
        )
    if cause == "construction":
        return (
            f"Coned single-lane closure on {corridor} with shuttle signal. "
            "Add advance signage 500 m upstream. Night-shift work if severity >= High."
        )
    if cause == "accident":
        return (
            "Move vehicles to shoulder once cleared by patrol. "
            f"Temporary 1-lane diversion on {corridor} until tow arrives."
        )
    if cause == "water_logging":
        return (
            f"Block affected stretch of {corridor}. "
            "Route traffic via the nearest grade-separated alternative. Deploy pumps."
        )
    if cause == "tree_fall":
        return (
            f"Single-lane closure on {corridor} until BBMP clears debris. "
            "Manual signalling for opposite-direction flow."
        )
    if cause in {"pot_holes", "road_conditions"}:
        return (
            f"Lane-restriction on {corridor} for the damaged stretch. "
            "Coordinate with BBMP for patch repair within the same shift."
        )
    if severity in {"High", "Critical"}:
        return (
            f"Full diversion off {corridor}. Activate next parallel corridor with "
            "signal-priority. Inform city control room."
        )
    return f"Soft diversion on {corridor} with cone-lane + advance signage."


def _suggested_units(severity: str, closure: bool, cause: str) -> list[str]:
    units = ["Traffic Police constables"]
    if severity in {"High", "Critical"}:
        units.append("Traffic Inspector (on-scene IC)")
    if closure or cause in {"vip_movement", "procession", "protest", "public_event"}:
        units.append("Home Guard squad")
    if cause in {"accident"}:
        units += ["Patrol vehicle + tow truck", "Ambulance on standby"]
    if cause in {"tree_fall"}:
        units.append("BBMP debris-clearance crew")
    if cause in {"water_logging"}:
        units.append("BWSSB pump unit")
    if cause in {"pot_holes", "road_conditions", "construction"}:
        units.append("BBMP works crew")
    if severity == "Critical":
        units.append("City control-room liaison")
    return units


def recommend(
    severity: str,
    cause: str,
    corridor: str,
    closure_prob: float,
    predicted_duration_min: float,
) -> ResourcePlan:
    severity = severity if severity in BASE_MANPOWER else "Medium"
    closure = closure_prob >= 0.5

    manpower = BASE_MANPOWER[severity] + CAUSE_MANPOWER_BOOST.get(cause, 0)
    barricades = BASE_BARRICADES[severity] + CAUSE_BARRICADE_BOOST.get(cause, 0)

    notes: list[str] = []
    if corridor in ARTERIAL_CORRIDORS:
        manpower += 2
        barricades += 2
        notes.append(f"{corridor} is an arterial corridor; staffing bumped +2.")

    if predicted_duration_min >= 720:  # >= 12h
        manpower += 2
        notes.append("Predicted duration >= 12h. Schedule a shift rotation.")
    if predicted_duration_min >= 1440:  # >= 24h
        manpower += 4
        barricades += 4
        notes.append("Multi-day event. Coordinate with adjacent police stations.")

    if closure and not barricades:
        barricades = 4
    if closure:
        notes.append(f"Road closure expected (prob={closure_prob:.2f}). Barricading mandatory.")

    needs_diversion = closure or cause in DIVERSION_CAUSES
    plan = _diversion_plan(cause, corridor, closure, severity)
    units = _suggested_units(severity, closure, cause)

    return ResourcePlan(
        manpower_count=int(manpower),
        barricades_count=int(barricades),
        needs_diversion=bool(needs_diversion),
        diversion_plan=plan,
        suggested_units=units,
        notes=notes,
    )
