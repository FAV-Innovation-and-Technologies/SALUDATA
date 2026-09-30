"""Deterministic, non-clinical synthetic sensor exports for research packaging.

This module is deliberately self-contained: it does not open network
connections, import an SDK, or submit to SALUDATA ingestion.  The canonical
event helper mirrors the closed synthetic/shadow measurement contract; legacy
and ECG helpers return separate research records and must not be treated as
vendor captures or FHIR resources.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from math import exp, pi, sin
from random import Random
from typing import Any, Mapping

RELEASE_START = datetime(2026, 3, 1, tzinfo=timezone.utc)
RELEASE_END = datetime(2026, 6, 1, tzinfo=timezone.utc)
SYNTHETIC_MARKERS = {"synthetic": True, "mode": "shadow", "clinical_use": False}

CANONICAL_METRICS: dict[str, str] = {
    "heart_rate": "beats/min",
    "oxygen_saturation": "%",
    "systolic_blood_pressure": "mm[Hg]",
    "diastolic_blood_pressure": "mm[Hg]",
    "body_weight": "kg",
    "accelerometer_rms": "m/s2",
    "activity_score": "1",
    "step_count": "count",
}

# Bounds here mirror the v1 *input validation* contract only.  They are not
# clinical reference ranges and this generator makes no clinical assertion.
_CANONICAL_INPUT_BOUNDS = {
    "heart_rate": (20, 260), "oxygen_saturation": (50, 100),
    "systolic_blood_pressure": (50, 280), "diastolic_blood_pressure": (30, 180),
    "body_weight": (20, 350), "accelerometer_rms": (0, 200),
    "activity_score": (0, 1), "step_count": (0, 200000),
}

LEGACY_DEVICE_METRICS: dict[str, dict[str, dict[str, str]]] = {
    "cosinuss_two": {
        "body_temperature": {"unit": "Cel", "loinc": "8310-5"},
        "heart_rate": {"unit": "beats/min", "loinc": "8867-4"},
        "oxygen_saturation": {"unit": "%", "loinc": "59408-5"},
    },
    "ihealth_bp7": {
        "systolic_blood_pressure": {"unit": "mm[Hg]", "loinc": "8480-6"},
        "diastolic_blood_pressure": {"unit": "mm[Hg]", "loinc": "8462-4"},
        "heart_rate": {"unit": "beats/min", "loinc": "8867-4"},
    },
    "ihealth_hs2s_pro": {
        "body_weight": {"unit": "kg", "loinc": "29463-7"},
        "bmi": {"unit": "kg/m2", "loinc": "39156-5"},
        "body_fat_percentage": {"unit": "%", "loinc": "77233-5"},
        "body_water_percentage": {"unit": "%", "loinc": "101684-9"},
        "muscle_percentage": {"unit": "%", "loinc": "73965-6"},
        "lean_body_mass": {"unit": "kg", "loinc": "88334-8"},
        "bone_mass": {"unit": "kg", "loinc": "101685-6"},
        "protein_percentage": {"unit": "%", "vendor_code": "protein-pct"},
        "visceral_fat_index": {"unit": "score", "loinc": "73708-0"},
        "basal_metabolic_rate": {"unit": "kcal/d", "loinc": "69429-9"},
        "body_age": {"unit": "a", "vendor_code": "body-age"},
        "heart_rate": {"unit": "beats/min", "loinc": "8867-4"},
    },
}

_DEVICE_MODELS = {
    "cosinuss_two": "Cosinuss Two",
    "ihealth_bp7": "iHealth BP7",
    "ihealth_hs2s_pro": "iHealth Nexus Pro (HS2S-Pro)",
}


def _hash(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _utc(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        raise TypeError("timestamp must be a datetime or ISO-8601 string")
    if parsed.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.astimezone(timezone.utc)


def utc_release_timestamp(value: str | datetime) -> str:
    """Return an RFC3339 UTC timestamp constrained to March--May 2026."""
    timestamp = _utc(value)
    if not RELEASE_START <= timestamp < RELEASE_END:
        raise ValueError("timestamp must be in [2026-03-01, 2026-06-01) UTC")
    return timestamp.isoformat().replace("+00:00", "Z")


def _patient_ref(value: Any) -> str:
    if not isinstance(value, str) or len(value) != 35 or not value.startswith("pt_"):
        raise ValueError("patient_ref must be pt_ followed by 32 lowercase hexadecimal characters")
    if any(char not in "0123456789abcdef" for char in value[3:]):
        raise ValueError("patient_ref must be pt_ followed by 32 lowercase hexadecimal characters")
    return value


def _device_ref(patient_ref: str, device_kind: str, supplied: Any) -> str:
    if supplied is None:
        return "dev_" + _hash(f"{patient_ref}:{device_kind}")[:32]
    if not isinstance(supplied, str) or len(supplied) != 36 or not supplied.startswith("dev_"):
        raise ValueError("device_ref must be dev_ followed by 32 lowercase hexadecimal characters")
    if any(char not in "0123456789abcdef" for char in supplied[4:]):
        raise ValueError("device_ref must be dev_ followed by 32 lowercase hexadecimal characters")
    return supplied


def _number(value: Any, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a finite number")
    numeric = float(value)
    if numeric != numeric or numeric in {float("inf"), float("-inf")}:
        raise ValueError(f"{name} must be a finite number")
    return numeric


def synthetic_quality(*, poor: bool = False) -> dict[str, Any]:
    """Explicit synthetic annotation; never a device-reported quality value."""
    return {
        "status": "poor" if poor else "good",
        "score": 0.25 if poor else 1.0,
        "coverage_ratio": 1.0,
        "artifact_codes": ["insufficient_samples"] if poor else [],
    }


def flat_row(
    patient_ref: str,
    timestamp: str | datetime,
    *,
    seed: int = 1,
    **overrides: Any,
) -> dict[str, Any]:
    """Create one deterministic flat research row containing all eight metrics.

    Values are intentionally unlabelled synthetic values.  Overrides are useful
    for experimental scenarios but are validated only when converted to the
    canonical contract.
    """
    patient = _patient_ref(patient_ref)
    occurred_at = utc_release_timestamp(timestamp)
    rng = Random(f"flat-row:{seed}:{patient}:{occurred_at}")
    defaults = {
        "heart_rate": round(62 + rng.random() * 25, 2),
        "oxygen_saturation": round(94 + rng.random() * 5, 2),
        "systolic_blood_pressure": round(108 + rng.random() * 30, 2),
        "diastolic_blood_pressure": round(66 + rng.random() * 20, 2),
        "body_weight": round(58 + rng.random() * 35, 2),
        "accelerometer_rms": round(0.03 + rng.random() * 1.2, 4),
        "activity_score": round(rng.random(), 4),
        "step_count": int(rng.random() * 12000),
        "body_temperature": round(36.0 + rng.random() * 1.2, 2),
    }
    unknown = set(overrides) - set(defaults) - {"device_ref", "source_parent_ref"}
    if unknown:
        raise ValueError(f"unsupported flat-row overrides: {sorted(unknown)}")
    defaults.update(overrides)
    return {
        "schema_version": "saludata.synthetic-flat-row.v1",
        "patient_ref": patient,
        "timestamp": occurred_at,
        "seed": seed,
        "source_parent_ref": str(overrides.get("source_parent_ref") or f"research:{patient}:{occurred_at}"),
        **defaults,
    }


def canonical_event(row: Mapping[str, Any], devicekind: str) -> dict[str, Any]:
    """Build an exact v1 canonical measurement event from a flat research row."""
    if devicekind not in {"smart_ring", "blood_pressure_monitor", "smart_scale"}:
        raise ValueError("devicekind must be smart_ring, blood_pressure_monitor, or smart_scale")
    patient = _patient_ref(row.get("patient_ref"))
    occurred_at = utc_release_timestamp(row.get("timestamp"))
    device = _device_ref(patient, devicekind, row.get("device_ref"))

    selected = {
        "smart_ring": ["heart_rate", "oxygen_saturation", "accelerometer_rms", "activity_score", "step_count"],
        "blood_pressure_monitor": ["systolic_blood_pressure", "diastolic_blood_pressure", "heart_rate"],
        "smart_scale": ["body_weight"],
    }[devicekind]
    measurements: list[dict[str, Any]] = []
    for code in selected:
        if row.get(code) is None:
            continue
        value = _number(row[code], code)
        lower, upper = _CANONICAL_INPUT_BOUNDS[code]
        if not lower <= value <= upper:
            raise ValueError(f"{code} is outside the canonical input contract")
        measurements.append({"code": code, "value": value, "unit": CANONICAL_METRICS[code], "quality": synthetic_quality()})
    if not measurements:
        raise ValueError("row supplies no measurements for this devicekind")
    if devicekind == "blood_pressure_monitor" and {item["code"] for item in measurements} < {"systolic_blood_pressure", "diastolic_blood_pressure"}:
        raise ValueError("blood_pressure_monitor needs systolic and diastolic values")
    if devicekind == "blood_pressure_monitor":
        values = {item["code"]: item["value"] for item in measurements}
        if values["systolic_blood_pressure"] <= values["diastolic_blood_pressure"]:
            raise ValueError("systolic_blood_pressure must exceed diastolic_blood_pressure")
    identity = _hash(f"{patient}:{device}:{devicekind}:{occurred_at}:{row.get('seed', '')}")[:32]
    event: dict[str, Any] = {
        "schema_version": "saludata.measurement-event.v1",
        "event_id": f"evt_research_{identity}",
        "event_type": "measurement.recorded",
        "correlation_id": f"flow_research_{identity}",
        "patient_ref": patient,
        "device_ref": device,
        "occurred_at": occurred_at,
        "produced_at": occurred_at,
        "source": {"kind": devicekind, "transport": "synthetic", "manufacturer_code": "SALUDATA_RESEARCH"},
        "measurements": measurements,
        **SYNTHETIC_MARKERS,
    }
    if devicekind == "smart_ring":
        state = "active" if _number(row["activity_score"], "activity_score") >= 0.5 else "rest_compatible"
        event["activity_context"] = {"state": state, "confidence": 1.0, "origin": "sensor"}
    validate_canonical_event_shape(event)
    return event


def validate_canonical_event_shape(event: Mapping[str, Any]) -> None:
    """Dependency-free structural check mirroring the closed v1 event schema."""
    required = {
        "schema_version", "event_id", "event_type", "correlation_id", "patient_ref", "device_ref",
        "occurred_at", "produced_at", "source", "measurements", "synthetic", "mode", "clinical_use",
    }
    allowed = required | {"activity_context", "symptoms"}
    if set(event) - allowed or required - set(event):
        raise ValueError("canonical event has an unsupported or missing top-level field")
    if event["schema_version"] != "saludata.measurement-event.v1" or event["event_type"] != "measurement.recorded":
        raise ValueError("canonical event schema/version is invalid")
    if dict((key, event[key]) for key in SYNTHETIC_MARKERS) != SYNTHETIC_MARKERS:
        raise ValueError("canonical event must remain synthetic shadow non-clinical")
    patient = _patient_ref(event["patient_ref"])
    _device_ref(patient, str(event["source"].get("kind", "")), event["device_ref"])
    if utc_release_timestamp(event["occurred_at"]) != event["occurred_at"] or utc_release_timestamp(event["produced_at"]) != event["produced_at"]:
        raise ValueError("canonical timestamps must be normalized release UTC timestamps")
    source = event["source"]
    if not isinstance(source, Mapping) or set(source) - {"kind", "transport", "manufacturer_code", "firmware_ref"}:
        raise ValueError("canonical source shape is invalid")
    if source.get("kind") not in {"smart_ring", "blood_pressure_monitor", "smart_scale", "mobile_app", "synthetic_device"}:
        raise ValueError("canonical source kind is invalid")
    if source.get("transport") not in {"bluetooth_le", "vendor_api", "manual", "synthetic"}:
        raise ValueError("canonical transport is invalid")
    if source.get("manufacturer_code") != "SALUDATA_RESEARCH":
        raise ValueError("research generator must use the synthetic manufacturer code")
    measurements = event["measurements"]
    if not isinstance(measurements, list) or not 1 <= len(measurements) <= 16:
        raise ValueError("canonical measurements must contain 1..16 entries")
    seen = set()
    for measurement in measurements:
        if set(measurement) != {"code", "value", "unit", "quality"}:
            raise ValueError("canonical measurement shape is invalid")
        code = measurement["code"]
        if code not in CANONICAL_METRICS or measurement["unit"] != CANONICAL_METRICS[code] or code in seen:
            raise ValueError("canonical measurement code/unit is invalid or repeated")
        seen.add(code)
        low, high = _CANONICAL_INPUT_BOUNDS[code]
        if not low <= _number(measurement["value"], code) <= high:
            raise ValueError("canonical measurement is outside input contract bounds")
        quality = measurement["quality"]
        if set(quality) != {"status", "score", "coverage_ratio", "artifact_codes"} or quality not in (synthetic_quality(), synthetic_quality(poor=True)):
            raise ValueError("canonical research quality annotation is invalid")
    if source["kind"] == "blood_pressure_monitor":
        if not {"systolic_blood_pressure", "diastolic_blood_pressure"}.issubset(seen):
            raise ValueError("blood-pressure event lacks paired components")
    if source["kind"] == "smart_scale" and "body_weight" not in seen:
        raise ValueError("scale event lacks body_weight")


def raw_window(
    patient_ref: str,
    date: str | datetime,
    seed: int,
    hr: float,
    activity: str,
    poor_ppg: bool = False,
) -> dict[str, Any]:
    """Return a 10-second, 25-Hz raw PPG + triaxial-accelerometer test window."""
    patient = _patient_ref(patient_ref)
    started_at = utc_release_timestamp(date)
    if activity not in {"rest_compatible", "active", "sleep", "unknown"}:
        raise ValueError("activity must be rest_compatible, active, sleep, or unknown")
    pulse = _number(hr, "hr")
    if pulse <= 0:
        raise ValueError("hr must be positive")
    rng = Random(f"raw-window:{seed}:{patient}:{started_at}")
    rate, count = 25, 250
    motion = 0.016 if activity in {"active", "unknown"} else 0.003
    ppg_amplitude = 0.006 if poor_ppg else 0.55
    ppg, x, y, z = [], [], [], []
    for index in range(count):
        seconds = index / rate
        noise = (rng.random() - 0.5) * (0.11 if poor_ppg else 0.025)
        ppg.append(round(1.0 + ppg_amplitude * sin(2 * pi * pulse * seconds / 60) + noise, 7))
        x.append(round(motion * sin(2 * pi * 1.2 * seconds) + (rng.random() - 0.5) * motion, 7))
        y.append(round(motion * sin(2 * pi * 0.8 * seconds) + (rng.random() - 0.5) * motion, 7))
        z.append(round(1.0 + motion * sin(2 * pi * 1.5 * seconds) + (rng.random() - 0.5) * motion, 7))
    identity = _hash(f"raw:{patient}:{started_at}:{seed}")[:32]
    window = {
        "window_id": f"research.raw.{identity}", "patient_ref": patient,
        "device_ref": _device_ref(patient, "smart_ring", None), "started_at": started_at,
        "manufacturer_code": "SALUDATA_RESEARCH", "firmware_ref": "fw_research_0001",
        "transport": "synthetic",
        "accelerometer": {"sample_rate_hz": rate, "unit": "g", "x": x, "y": y, "z": z},
        "ppg": {"sample_rate_hz": rate, "unit": "relative", "samples": ppg},
        **SYNTHETIC_MARKERS,
    }
    validate_raw_window_shape(window)
    return window


def validate_raw_window_shape(window: Mapping[str, Any]) -> None:
    """Dependency-free structural check for the exact raw-window request shape."""
    required = {
        "window_id", "patient_ref", "device_ref", "started_at", "manufacturer_code", "firmware_ref",
        "transport", "accelerometer", "ppg", "synthetic", "mode", "clinical_use",
    }
    if set(window) != required:
        raise ValueError("raw window has an unsupported or missing top-level field")
    patient = _patient_ref(window["patient_ref"])
    _device_ref(patient, "smart_ring", window["device_ref"])
    utc_release_timestamp(window["started_at"])
    if window["manufacturer_code"] != "SALUDATA_RESEARCH" or window["transport"] != "synthetic":
        raise ValueError("raw research provenance is invalid")
    if dict((key, window[key]) for key in SYNTHETIC_MARKERS) != SYNTHETIC_MARKERS:
        raise ValueError("raw window must remain synthetic shadow non-clinical")
    accel, ppg = window["accelerometer"], window["ppg"]
    if not isinstance(accel, Mapping) or set(accel) != {"sample_rate_hz", "unit", "x", "y", "z"}:
        raise ValueError("accelerometer shape is invalid")
    if accel["sample_rate_hz"] != 25 or accel["unit"] != "g":
        raise ValueError("raw generator must emit 25-Hz g accelerometry")
    axes = [accel[axis] for axis in ("x", "y", "z")]
    if any(not isinstance(axis, list) or len(axis) != 250 for axis in axes):
        raise ValueError("raw generator must emit 250 samples per accelerometer axis")
    if ppg is not None:
        if not isinstance(ppg, Mapping) or set(ppg) != {"sample_rate_hz", "unit", "samples"}:
            raise ValueError("PPG shape is invalid")
        if ppg["sample_rate_hz"] != 25 or ppg["unit"] != "relative" or not isinstance(ppg["samples"], list) or len(ppg["samples"]) != 250:
            raise ValueError("raw generator must emit 250 relative PPG samples at 25 Hz")
    ppg_samples = [] if ppg is None else ppg["samples"]
    for value in [*axes[0], *axes[1], *axes[2], *ppg_samples]:
        _number(value, "raw sample")


def composition(
    weight_kg: float, height_cm: float, age: int, sex: str, *, seed: int = 1, heart_rate: float = 72,
) -> dict[str, float]:
    """Toy composition formula, explicitly not an iHealth/vendor algorithm.

    It only creates internally consistent simulated fields for research tests.
    ``sex`` is a synthetic scenario label (female, male, other), not an
    asserted identity characteristic.
    """
    weight, height, pulse = _number(weight_kg, "weight_kg"), _number(height_cm, "height_cm"), _number(heart_rate, "heart_rate")
    if weight <= 0 or height <= 0 or age < 0 or sex not in {"female", "male", "other"}:
        raise ValueError("weight, height and age must be positive; sex must be female, male, or other")
    rng = Random(f"composition:{seed}:{weight}:{height}:{age}:{sex}")
    sex_offset = {"female": 5.0, "male": -3.0, "other": 1.0}[sex]
    body_fat = max(5.0, min(55.0, 18.0 + sex_offset + 0.09 * (age - 35) + rng.uniform(-2, 2)))
    lean = weight * (1 - body_fat / 100)
    return {
        "body_weight": round(weight, 2), "bmi": round(weight / (height / 100) ** 2, 2),
        "body_fat_percentage": round(body_fat, 2), "body_water_percentage": round(max(30, min(75, 61 - body_fat * 0.26)), 2),
        "muscle_percentage": round(max(15, min(65, 46 - body_fat * 0.22 + (2 if sex == "male" else 0))), 2),
        "lean_body_mass": round(lean, 2), "bone_mass": round(max(1, lean * 0.055), 2),
        "protein_percentage": round(max(8, min(25, 20 - body_fat * 0.08)), 2),
        "visceral_fat_index": round(max(1, min(30, 5 + body_fat * 0.18 + rng.uniform(-1, 1))), 2),
        "basal_metabolic_rate": round(850 + weight * 8 + height * 3 - age * 2 + (80 if sex == "male" else 0), 2),
        "body_age": round(max(0, age + rng.uniform(-4, 4)), 1), "heart_rate": round(pulse, 2),
    }


def legacy_device_record(device_class: str, row: Mapping[str, Any], *, composition_values: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Create a separate, provenance-labelled legacy-device research record."""
    if device_class not in LEGACY_DEVICE_METRICS:
        raise ValueError(f"unsupported legacy device class: {device_class}")
    patient = _patient_ref(row.get("patient_ref"))
    timestamp = utc_release_timestamp(row.get("timestamp"))
    values = dict(composition_values or {})
    values.update({key: value for key, value in row.items() if value is not None})
    measurements = []
    for name, definition in LEGACY_DEVICE_METRICS[device_class].items():
        source_name = "body_temperature" if name == "body_temperature" else name
        if source_name not in values:
            continue
        measurements.append({"name": name, "value": _number(values[source_name], name), **definition})
    if not measurements:
        raise ValueError("no legacy-device measurements supplied")
    return {
        "schema_version": "saludata.synthetic-legacy-device-record.v1",
        "record_id": "legacy_research_" + _hash(f"{device_class}:{patient}:{timestamp}:{row.get('seed', '')}")[:32],
        "device_class": device_class, "declared_model": _DEVICE_MODELS[device_class],
        "patient_ref": patient, "timestamp": timestamp,
        "source_parent": {"patient_ref": patient, "timestamp": timestamp, "ref": row.get("source_parent_ref", "research:unlabelled")},
        "measurements": measurements,
        "provenance": {"synthetic": True, "research_only": True, "not_a_vendor_capture": True, "not_a_fhir_bundle": True},
    }


def ecg_window(patient_ref: str, date: str | datetime, seed: int = 1) -> dict[str, Any]:
    """Return an analytic 10-second Lead-II mV waveform, not device data."""
    patient = _patient_ref(patient_ref)
    started_at = utc_release_timestamp(date)
    rng, rate, count = Random(f"ecg:{seed}:{patient}:{started_at}"), 125, 1250
    samples = []
    for index in range(count):
        phase = (index / rate) % 1.0
        # Analytic P-QRS-T morphology plus tiny deterministic simulation noise.
        signal = (0.10 * exp(-((phase - 0.18) / 0.045) ** 2) - 0.12 * exp(-((phase - 0.39) / 0.014) ** 2)
                  + 1.0 * exp(-((phase - 0.42) / 0.018) ** 2) - 0.22 * exp(-((phase - 0.46) / 0.016) ** 2)
                  + 0.28 * exp(-((phase - 0.70) / 0.09) ** 2) + (rng.random() - 0.5) * 0.012)
        samples.append(round(signal, 6))
    return {
        "schema_version": "saludata.research-ecg-window.v1", "window_id": "ecg_research_" + _hash(f"{patient}:{started_at}:{seed}")[:32],
        "patient_ref": patient, "started_at": started_at, "duration_seconds": 10, "lead": "II", "unit": "mV", "sample_rate_hz": rate,
        "samples_mv": samples, "source_parent": {"patient_ref": patient, "timestamp": started_at, "ref": f"research:{patient}:{started_at}"},
        "provenance": {"synthetic": True, "research_only": True, "hypothetical_sensor": "unknown", "not_a_hardware_adapter": True},
    }
