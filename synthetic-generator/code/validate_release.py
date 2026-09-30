#!/usr/bin/env python3
"""Read-only, streaming validator for a prepared SALUDATA synthetic release.

It performs no HTTP calls and never edits release files.  Reports are printed
as JSON and may optionally be written *outside* the release directory.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import re
import sqlite3
import sys
import tempfile
import itertools
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable


RELEASE_START = datetime(2026, 3, 1, tzinfo=UTC)
RELEASE_END = datetime(2026, 6, 1, tzinfo=UTC)
SPLITS = {"train", "validation", "test"}
PROFILE_REQUIRED = {"patient_ref", "split", "scenario_id", "family_id", "age_years", "sex_at_birth", "height_cm", "baseline_weight_kg"}
OBS_IDENTITY_REQUIRED = {
    "observation_id", "patient_ref", "split", "timestamp", "hr", "spo2", "sbp", "dbp", "temp_c",
    "respiration_rate", "weight", "activity_score", "accelerometer_rms", "step_count", "bp_pulse",
}
# These are research-table fields.  They deliberately do not reuse the
# narrower canonical API event vocabulary in sensor_exports.py.
DATASET_METRIC_BOUNDS = {
    "hr": (20.0, 260.0), "spo2": (50.0, 100.0), "sbp": (50.0, 280.0), "dbp": (30.0, 180.0),
    "temp_c": (20.0, 45.0), "respiration_rate": (1.0, 100.0), "weight": (20.0, 350.0),
    "activity_score": (0.0, 1.0), "accelerometer_rms": (0.0, 200.0), "step_count": (0.0, 200000.0),
    "bp_pulse": (1.0, 250.0),
    "bmi": (8.0, 100.0), "body_fat_percentage": (0.0, 100.0), "body_water_percentage": (0.0, 100.0),
    "muscle_percentage": (0.0, 100.0), "lean_body_mass": (0.0, 300.0), "bone_mass": (0.0, 20.0),
    "protein_percentage": (0.0, 100.0), "visceral_fat_index": (0.0, 100.0),
    "basal_metabolic_rate": (100.0, 10000.0), "body_age": (0.0, 150.0),
}
DATASET_METRICS = frozenset(DATASET_METRIC_BOUNDS)
FORBIDDEN_INPUT_KEYS = {"scenario_id", "family_id", "reference", "priority", "deterministic_rules"}
MONTH_NAME = re.compile(r"^(20\d{2})-(0[1-9]|1[0-2])\.parquet$")
CASE_NAME = re.compile(r"^(train|validation|test)-(20\d{2})-(0[1-9]|1[0-2])\.jsonl\.gz$")
SENSOR_SAMPLE_NAME = "sensor-contract-examples.jsonl.gz"
SENSOR_SAMPLE_SCHEMAS = {
    "canonical_events": "measurement-event.schema.json",
    "raw_ring_window": "raw-signal-window.schema.json",
    "legacy_device_records": "legacy-device-record.schema.json",
    "research_ecg_window": "research-ecg-window.schema.json",
}


@dataclass
class Audit:
    errors: list[dict[str, str]] = field(default_factory=list)
    warnings: list[dict[str, str]] = field(default_factory=list)
    counts: Counter = field(default_factory=Counter)
    limit: int = 500

    def issue(self, kind: str, message: str, *, path: str = "") -> None:
        if len(self.errors) < self.limit:
            self.errors.append({"kind": kind, "message": message, "path": path})
        self.counts[f"error_{kind}"] += 1

    def warn(self, kind: str, message: str, *, path: str = "") -> None:
        if len(self.warnings) < self.limit:
            self.warnings.append({"kind": kind, "message": message, "path": path})
        self.counts[f"warning_{kind}"] += 1


def utc(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.endswith("Z"):
        return None
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        return None
    return parsed.astimezone(UTC) if parsed.tzinfo else None


def finite_in_bounds(value: Any, lower: float, upper: float) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return math.isfinite(float(value)) and lower <= float(value) <= upper


def sha256_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def require_pyarrow() -> Any:
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("pyarrow is required; install it in the validator environment") from exc
    return pq


def parquet_columns(path: Path, audit: Audit) -> set[str]:
    pq = require_pyarrow()
    try:
        return set(pq.ParquetFile(path).schema_arrow.names)
    except Exception as exc:
        audit.issue("parquet_open", f"cannot read parquet schema: {type(exc).__name__}: {exc}", path=str(path))
        return set()


def iter_parquet_rows(path: Path, columns: list[str]) -> Iterable[dict[str, Any]]:
    pq = require_pyarrow()
    file = pq.ParquetFile(path)
    for batch in file.iter_batches(batch_size=8192, columns=columns):
        yield from batch.to_pylist()


def profile_rows(release: Path, audit: Audit) -> dict[str, dict[str, Any]]:
    path = release / "data" / "profiles.parquet"
    if not path.is_file():
        audit.issue("missing_profiles", "required data/profiles.parquet is absent", path=str(path))
        return {}
    columns = parquet_columns(path, audit)
    missing = PROFILE_REQUIRED - columns
    if missing:
        audit.issue("profile_schema", f"missing columns: {sorted(missing)}", path=str(path))
        return {}
    profiles: dict[str, dict[str, Any]] = {}
    family_splits: dict[str, str] = {}
    try:
        for row in iter_parquet_rows(path, sorted(PROFILE_REQUIRED)):
            audit.counts["profile_rows"] += 1
            patient = row["patient_ref"]
            split = row["split"]
            family = row["family_id"]
            if not isinstance(patient, str) or not patient:
                audit.issue("profile_patient", "patient_ref must be a non-empty string", path=str(path)); continue
            if patient in profiles:
                audit.issue("profile_duplicate", f"duplicate patient_ref {patient}", path=str(path)); continue
            if split not in SPLITS:
                audit.issue("profile_split", f"invalid split {split!r}", path=str(path)); continue
            if not isinstance(family, str) or not family:
                audit.issue("profile_family", "family_id must be a non-empty string", path=str(path)); continue
            previous = family_splits.setdefault(family, split)
            if previous != split:
                audit.issue("family_split", f"family_id {family} appears in {previous!r} and {split!r}", path=str(path))
            for name in ("age_years", "height_cm", "baseline_weight_kg"):
                if not finite_in_bounds(row[name], 0.0, 500.0):
                    audit.issue("profile_value", f"{name} must be finite and plausible", path=str(path))
            profiles[patient] = {"split": split, "family_id": family}
    except Exception as exc:
        audit.issue("profile_read", f"cannot stream profile rows: {type(exc).__name__}: {exc}", path=str(path))
    return profiles


def init_index(directory: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(directory / "validator-index.sqlite3")
    connection.execute("PRAGMA journal_mode=OFF")
    connection.execute("PRAGMA synchronous=OFF")
    connection.execute("CREATE TABLE observations (id TEXT PRIMARY KEY, patient TEXT NOT NULL, split TEXT NOT NULL, ts TEXT NOT NULL, measurements TEXT NOT NULL)")
    connection.execute("CREATE TABLE cases (id TEXT PRIMARY KEY)")
    return connection


def validate_observations(release: Path, profiles: dict[str, dict[str, Any]], index: sqlite3.Connection, audit: Audit) -> None:
    root = release / "data" / "observations"
    if not root.is_dir():
        audit.issue("missing_observations", "required data/observations directory is absent", path=str(root)); return
    files = sorted(root.glob("*/*.parquet"))
    if not files:
        audit.issue("missing_observations", "no observation parquet partitions found", path=str(root)); return
    for path in files:
        split = path.parent.name
        month_match = MONTH_NAME.match(path.name)
        if split not in SPLITS or not month_match:
            audit.issue("observation_partition", "expected observations/{train|validation|test}/YYYY-MM.parquet", path=str(path)); continue
        expected_month = f"{month_match.group(1)}-{month_match.group(2)}"
        columns = parquet_columns(path, audit)
        missing = OBS_IDENTITY_REQUIRED - columns
        if missing:
            audit.issue("observation_schema", f"missing columns: {sorted(missing)}", path=str(path)); continue
        active_metrics = sorted(DATASET_METRICS & columns)
        marker_columns = sorted({"synthetic", "clinical_use", "mode"} & columns)
        try:
            for row in iter_parquet_rows(path, sorted((OBS_IDENTITY_REQUIRED - DATASET_METRICS) | set(active_metrics) | set(marker_columns))):
                audit.counts["observation_rows"] += 1
                if audit.counts['observation_rows'] % 250000 == 0:
                    print(f"validated observation rows={audit.counts['observation_rows']}",file=sys.stderr,flush=True)
                patient, stated_split, oid, timestamp = row["patient_ref"], row["split"], row["observation_id"], row["timestamp"]
                if not isinstance(oid, str) or not oid:
                    audit.issue("observation_id", "observation_id must be a non-empty string", path=str(path)); continue
                patient_profile = profiles.get(patient)
                if patient_profile is None:
                    audit.issue("observation_patient", f"unknown patient_ref {patient!r}", path=str(path)); continue
                if stated_split != split or patient_profile["split"] != split:
                    audit.issue("observation_split", f"row/profile/path split mismatch for {oid}", path=str(path))
                parsed = utc(timestamp)
                if parsed is None or not RELEASE_START <= parsed < RELEASE_END:
                    audit.issue("observation_timestamp", f"timestamp must be RFC3339 UTC within release interval: {timestamp!r}", path=str(path)); continue
                if parsed.strftime("%Y-%m") != expected_month:
                    audit.issue("observation_month", f"timestamp month does not match partition {expected_month}", path=str(path))
                for name in active_metrics:
                    bounds = DATASET_METRIC_BOUNDS[name]
                    # Missingness is an explicit null in Parquet, not a sentinel
                    # numeric value.  Null is valid and counted; NaN/inf/strings
                    # are invalid whenever a measurement is supplied.
                    if row[name] is None:
                        audit.counts[f"missing_{name}"] += 1
                    elif not finite_in_bounds(row[name], *bounds):
                        audit.issue("observation_value", f"{name} is not finite/in physical bounds for {oid}", path=str(path))
                if finite_in_bounds(row["sbp"], *DATASET_METRIC_BOUNDS["sbp"]) and finite_in_bounds(row["dbp"], *DATASET_METRIC_BOUNDS["dbp"]) and float(row["sbp"]) <= float(row["dbp"]):
                    audit.issue("blood_pressure", f"sbp must exceed dbp for {oid}", path=str(path))
                if "synthetic" in marker_columns:
                    audit.counts["synthetic_marker_rows"] += 1
                    if row["synthetic"] is not True:
                        audit.issue("synthetic_marker", f"synthetic must be true for {oid}", path=str(path))
                if "clinical_use" in marker_columns and row["clinical_use"] is not False:
                    audit.issue("synthetic_marker", f"clinical_use must be false for {oid}", path=str(path))
                if "mode" in marker_columns:
                    audit.counts["mode_marker_rows"] += 1
                # Keep the full available research-frame metric map, including
                # null values, so a case cannot silently turn missingness into a
                # measurement.
                measurements = {name: row[name] for name in active_metrics}
                try:
                    index.execute(
                        "INSERT INTO observations VALUES (?, ?, ?, ?, ?)",
                        (oid, patient, stated_split, timestamp, json.dumps(measurements, sort_keys=True, allow_nan=False)),
                    )
                except sqlite3.IntegrityError:
                    audit.issue("observation_duplicate", f"duplicate observation_id {oid}", path=str(path))
        except Exception as exc:
            audit.issue("observation_read", f"cannot stream observation rows: {type(exc).__name__}: {exc}", path=str(path))
        index.commit()


def walk_key_values(value: Any, path: str = "") -> Iterable[tuple[str, Any, str]]:
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            yield str(key), child, child_path
            yield from walk_key_values(child, child_path)
    elif isinstance(value, list):
        for number, child in enumerate(value):
            yield from walk_key_values(child, f"{path}[{number}]")


def patient_from_input(patient: Any) -> str | None:
    if isinstance(patient, str):
        return patient
    if isinstance(patient, dict):
        for key in ("patient_ref", "id"):
            value = patient.get(key)
            if isinstance(value, str):
                return value
    return None


def validate_case_observation(item: Any, patient: str, split: str, cutoff: datetime, index: sqlite3.Connection, audit: Audit, path: str) -> None:
    if not isinstance(item, dict):
        audit.issue("case_observation", "input observation must be an object", path=path); return
    oid = item.get("observation_id")
    given_ts = item.get("timestamp")
    if not isinstance(oid, str):
        audit.issue("case_observation", "input observation lacks observation_id", path=path); return
    found = index.execute("SELECT patient, split, ts, measurements FROM observations WHERE id = ?", (oid,)).fetchone()
    if found is None:
        audit.issue("case_observation", f"input references unknown observation_id {oid}", path=path); return
    observed_at = utc(found[2])
    if found[0] != patient or found[1] != split:
        audit.issue("case_observation", f"input observation {oid} belongs to another patient/split", path=path)
    if given_ts != found[2]:
        audit.issue("case_observation", f"input timestamp does not match source observation {oid}", path=path)
    if observed_at is None or observed_at > cutoff:
        audit.issue("case_future", f"input references observation after assessment cutoff: {oid}", path=path)
    measurements = item.get("measurements")
    if not isinstance(measurements, dict) or not measurements:
        audit.issue("case_measurements", "input observation must contain a non-empty measurements object", path=path)
        return
    unknown = set(measurements) - DATASET_METRICS
    if unknown:
        audit.issue("case_measurements", f"measurement keys are not dataset metrics: {sorted(unknown)}", path=path)
    expected = json.loads(found[3])
    omitted = set(expected) - set(measurements)
    if omitted:
        audit.issue("case_measurements", f"case measurements omit available dataset metrics: {sorted(omitted)}", path=path)
    for name, value in measurements.items():
        if name not in DATASET_METRICS:
            continue
        if name not in expected:
            audit.issue("case_measurements", f"measurement {name} is unavailable in observation {oid}", path=path)
        elif expected[name] is None:
            if value is not None:
                audit.issue("case_measurements", f"measurement {name} invents a value where observation {oid} is null", path=path)
        elif value is None or not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(float(value)) or not math.isclose(float(value), float(expected[name]), rel_tol=0.0, abs_tol=1e-9):
            audit.issue("case_measurements", f"measurement {name} does not equal observed value for {oid}", path=path)


def earliest_current_observation(observations: Any) -> datetime | None:
    if not isinstance(observations, list):
        return None
    timestamps = [utc(item.get("timestamp")) for item in observations if isinstance(item, dict)]
    valid = [timestamp for timestamp in timestamps if timestamp is not None]
    return min(valid) if valid else None


def validate_history_summary(history: Any, earliest_current: datetime | None, assessment_at: datetime, audit: Audit, path: str) -> None:
    """Require explicitly causal, UTC history windows without recomputing summaries."""
    if not isinstance(history, dict):
        audit.issue("history_shape", "history_summary must be an object", path=path)
        return
    status = history.get("status")
    windows = history.get("windows")
    cutoff_value = history.get("cutoff")
    cutoff = utc(cutoff_value)
    if cutoff is None or not RELEASE_START <= cutoff < RELEASE_END:
        audit.issue("history_timestamp", "history_summary.cutoff must be an RFC3339 UTC timestamp in the release interval", path=f"{path}.cutoff")
    elif cutoff > assessment_at:
        audit.issue("history_cutoff", "history_summary.cutoff is after assessment_at", path=f"{path}.cutoff")
    elif earliest_current is not None and cutoff > earliest_current:
        audit.issue("history_cutoff", "history_summary.cutoff is after the earliest current observation", path=f"{path}.cutoff")
    if status not in {"available", "not_provided"}:
        audit.issue("history_shape", "history_summary.status must be available or not_provided", path=f"{path}.status")
    if not isinstance(windows, dict):
        audit.issue("history_shape", "history_summary.windows must be an object", path=f"{path}.windows")
        return
    if status == "not_provided":
        if windows:
            audit.issue("history_shape", "not_provided history must have windows={}", path=f"{path}.windows")
        return
    for name, window in windows.items():
        window_path = f"{path}.windows.{name}"
        if not isinstance(window, dict):
            audit.issue("history_shape", "history window must be an object", path=window_path)
            continue
        start, end = utc(window.get("start")), utc(window.get("end_exclusive"))
        if start is None or end is None:
            audit.issue("history_timestamp", "history window start and end_exclusive must be RFC3339 UTC strings", path=window_path)
            continue
        if not RELEASE_START <= start < RELEASE_END or not RELEASE_START <= end < RELEASE_END:
            audit.issue("history_window", "history window timestamps must be within the release interval", path=window_path)
        if start >= end:
            audit.issue("history_window", "history window start must precede end_exclusive", path=window_path)
        if earliest_current is not None and end > earliest_current:
            audit.issue("history_window", "history window end_exclusive is after the earliest current observation", path=f"{window_path}.end_exclusive")


def validate_cases(release: Path, profiles: dict[str, dict[str, Any]], index: sqlite3.Connection, audit: Audit) -> None:
    root = release / "cases"
    if not root.is_dir():
        audit.issue("missing_cases", "required cases directory is absent", path=str(root)); return
    files = sorted(root.glob("*.jsonl.gz"))
    if not files:
        audit.issue("missing_cases", "no cases/*.jsonl.gz files found", path=str(root)); return
    for file in files:
        match = CASE_NAME.match(file.name)
        if not match:
            audit.issue("case_partition", "expected cases/{split}-YYYY-MM.jsonl.gz", path=str(file)); continue
        split, expected_month = match.group(1), f"{match.group(2)}-{match.group(3)}"
        try:
            with gzip.open(file, "rt", encoding="utf-8") as handle:
                for line_number, line in enumerate(handle, start=1):
                    if not line.strip():
                        continue
                    audit.counts["case_rows"] += 1
                    if audit.counts['case_rows'] % 10000 == 0:
                        print(f"validated case rows={audit.counts['case_rows']}",file=sys.stderr,flush=True)
                    path = f"{file}:{line_number}"
                    try:
                        case = json.loads(line)
                    except json.JSONDecodeError as exc:
                        audit.issue("case_json", f"invalid JSON: {exc}", path=path); continue
                    if not isinstance(case, dict):
                        audit.issue("case_shape", "case must be an object", path=path); continue
                    case_id, input_value, reference = case.get("case_id"), case.get("input"), case.get("reference")
                    if not isinstance(case_id, str) or not case_id:
                        audit.issue("case_id", "case_id must be a non-empty string", path=path); continue
                    try:
                        index.execute("INSERT INTO cases VALUES (?)", (case_id,))
                    except sqlite3.IntegrityError:
                        audit.issue("case_duplicate", f"duplicate case_id {case_id}", path=path)
                    if case.get("split") != split:
                        audit.issue("case_split", "case split does not match file partition", path=path)
                    if not isinstance(input_value, dict) or not isinstance(reference, dict):
                        audit.issue("case_shape", "case must contain object input and reference", path=path); continue
                    forbidden = [child_path for key, _, child_path in walk_key_values(input_value) if key.lower() in FORBIDDEN_INPUT_KEYS]
                    if forbidden:
                        audit.issue("input_leakage", f"forbidden metadata keys in input: {forbidden}", path=path)
                    patient = patient_from_input(input_value.get("patient"))
                    cutoff = utc(input_value.get("assessment_at"))
                    if patient not in profiles:
                        audit.issue("case_patient", f"input patient not found in profiles: {patient!r}", path=path); continue
                    if profiles[patient]["split"] != split:
                        audit.issue("case_patient_split", "input patient split conflicts with case split", path=path)
                    if cutoff is None or not RELEASE_START <= cutoff < RELEASE_END:
                        audit.issue("case_cutoff", "assessment_at must be RFC3339 UTC within release interval", path=path); continue
                    if cutoff.strftime("%Y-%m") != expected_month:
                        audit.issue("case_month", "assessment_at month does not match case file partition", path=path)
                    observations = input_value.get("observations")
                    if not isinstance(observations, list):
                        audit.issue("case_observations", "input.observations must be a list", path=path)
                    else:
                        for number, observation in enumerate(observations):
                            validate_case_observation(observation, patient, split, cutoff, index, audit, f"{path}.input.observations[{number}]")
                    history = input_value.get("history_summary")
                    validate_history_summary(
                        history,
                        earliest_current_observation(observations),
                        cutoff,
                        audit,
                        f"{path}.input.history_summary",
                    )
                    for _, value, nested_path in walk_key_values(history, f"{path}.input.history_summary"):
                        # A history is permitted to have free text, but every
                        # RFC3339 UTC value embedded in it must remain pre-cutoff.
                        history_time = utc(value) if isinstance(value, str) else None
                        if history_time is not None and history_time > cutoff:
                            audit.issue("history_cutoff", "history timestamp is after assessment cutoff", path=nested_path)
                    for key, value, nested_path in walk_key_values(reference, f"{path}.reference"):
                        if key == "evidence_ids":
                            if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
                                audit.issue("reference_evidence", "evidence_ids must be a list of observation IDs", path=nested_path)
                            else:
                                for oid in value:
                                    found = index.execute("SELECT patient, split, ts FROM observations WHERE id = ?", (oid,)).fetchone()
                                    if found is None:
                                        audit.issue("reference_evidence", f"evidence_id does not exist: {oid}", path=nested_path)
                                    elif found[0] != patient or found[1] != split or utc(found[2]) > cutoff:
                                        audit.issue("reference_evidence", f"evidence_id is not pre-cutoff patient evidence: {oid}", path=nested_path)
        except (OSError, EOFError) as exc:
            audit.issue("case_gzip", f"cannot decompress/read: {type(exc).__name__}: {exc}", path=str(file))
    index.commit()


def manifest_entries(value: Any) -> dict[str, dict[str, Any]]:
    if isinstance(value, dict):
        return {str(name): details for name, details in value.items() if isinstance(details, dict)}
    if isinstance(value, list):
        return {str(item.get("name") or item.get("path")): item for item in value if isinstance(item, dict) and (item.get("name") or item.get("path"))}
    return {}


def validate_manifest(release: Path, audit: Audit) -> None:
    path = release / "manifest.json"
    if not path.is_file():
        audit.issue("missing_manifest", "required release/manifest.json is absent", path=str(path)); return
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        audit.issue("manifest_json", f"cannot parse manifest: {exc}", path=str(path)); return
    required = {"patients", "observation_rows", "episodes", "scenario_recipes", "files"}
    missing = required - set(manifest) if isinstance(manifest, dict) else required
    if missing:
        audit.issue("manifest_shape", f"missing keys: {sorted(missing)}", path=str(path)); return
    expected_counts = {"patients": audit.counts["profile_rows"], "observation_rows": audit.counts["observation_rows"], "episodes": audit.counts["case_rows"]}
    for key, actual in expected_counts.items():
        if manifest.get(key) != actual:
            audit.issue("manifest_count", f"{key}={manifest.get(key)!r}, actual={actual}", path=str(path))
    entries = manifest_entries(manifest["files"])
    if not entries:
        audit.issue("manifest_files", "files inventory is empty or malformed", path=str(path)); return
    for name, metadata in entries.items():
        candidate = (release / name).resolve()
        if release.resolve() not in candidate.parents or not candidate.is_file():
            audit.issue("manifest_file", f"listed file missing/outside release: {name}", path=str(path)); continue
        digest, size = sha256_file(candidate)
        if metadata.get("sha256") != digest or metadata.get("bytes") != size:
            audit.issue("manifest_hash", f"checksum/bytes mismatch for {name}", path=str(path))


def validate_source_manifest(path: Path, audit: Audit) -> None:
    try:
        source = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        audit.issue("source_manifest", f"cannot read source manifest: {exc}", path=str(path)); return
    if not isinstance(source.get("actual_n"), int) or source["actual_n"] < 500:
        audit.issue("source_calibration", f"actual_n must be >=500, got {source.get('actual_n')!r}", path=str(path))
    valid = source.get("valid_record_n_by_calibration_field")
    if not isinstance(valid, dict) or any(not isinstance(valid.get(key), int) or valid[key] < 1 for key in ("hr", "spo2", "sbp", "dbp", "rr")):
        audit.issue("source_calibration", "source manifest lacks valid counts for required calibration fields", path=str(path))

def validate_sft(release:Path,audit:Audit)->None:
    """Pair each training-formatted row with its unmodified case/context."""
    master_path=release/'MASTER_PROMPT.txt'
    if not master_path.exists():
        audit.warn('sft_absent','No master prompt/SFT layer present');return
    master=master_path.read_text().rstrip('\n')
    canon=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)
    for path in sorted((release/'cases').glob('*.jsonl.gz')):
        sft=release/'sft'/path.name
        if not sft.is_file():audit.issue('sft_absent','Missing paired SFT shard',path=str(sft));continue
        with gzip.open(path,'rt') as left,gzip.open(sft,'rt') as right:
            for a,b in itertools.zip_longest(left,right):
                if a is None or b is None:
                    audit.issue('sft_count','Case/SFT line counts differ',path=str(sft));break
                case,training=json.loads(a),json.loads(b)
                expected=[{'role':'user','content':master+'\n'+canon(case['input'])},
                          {'role':'assistant','content':canon(case['reference'])}]
                if training.get('case_id')!=case['case_id'] or training.get('messages')!=expected:
                    audit.issue('sft_pairing','SFT row differs from exact case/reference',path=str(sft))
                audit.counts['sft_rows']+=1


def load_sensor_schema_validators(release: Path, audit: Audit) -> dict[str, Any]:
    """Load whichever published sample schemas are present, without mutation.

    The small structural validator fixtures predate the optional samples layer,
    so schema absence is a warning rather than a release failure.  A malformed
    schema, however, makes a claimed schema validation impossible and is an
    error.
    """
    try:
        import jsonschema
    except ImportError:
        audit.issue("sensor_schema_dependency", "jsonschema is required when sensor schemas are present")
        return {}
    validators: dict[str, Any] = {}
    for section, filename in SENSOR_SAMPLE_SCHEMAS.items():
        path = release / "schemas" / filename
        if not path.is_file():
            audit.warn("sensor_schema_absent", f"optional schema is absent: schemas/{filename}", path=str(path))
            continue
        try:
            schema = json.loads(path.read_text(encoding="utf-8"))
            validator_class = jsonschema.validators.validator_for(schema)
            validator_class.check_schema(schema)
            validators[section] = validator_class(schema)
        except (OSError, json.JSONDecodeError, jsonschema.exceptions.SchemaError) as exc:
            audit.issue("sensor_schema", f"cannot load schema {filename}: {type(exc).__name__}: {exc}", path=str(path))
    return validators


def validate_sensor_value(
    value: Any,
    section: str,
    validators: dict[str, Any],
    audit: Audit,
    path: str,
) -> None:
    validator = validators.get(section)
    if validator is None:
        return
    for error in validator.iter_errors(value):
        location = "/".join(str(part) for part in error.absolute_path)
        suffix = f" at {location}" if location else ""
        audit.issue("sensor_schema", f"{section} violates its schema{suffix}: {error.message}", path=path)


def _sample_parent(index: sqlite3.Connection, parent_id: Any) -> tuple[str, str] | None:
    if not isinstance(parent_id, str):
        return None
    row = index.execute("SELECT patient, ts FROM observations WHERE id = ?", (parent_id,)).fetchone()
    return (str(row[0]), str(row[1])) if row else None


def _same_sample_parent(value: Any, patient: str, timestamp: str, field: str, audit: Audit, path: str) -> None:
    if not isinstance(value, dict):
        return
    if value.get("patient_ref") != patient:
        audit.issue("sensor_parent", f"{field}.patient_ref does not match parent observation", path=path)
    timestamp_key = (
        "occurred_at" if field == "canonical_events"
        else "started_at" if field in {"raw_ring_window", "research_ecg_window"}
        else "timestamp"
    )
    if value.get(timestamp_key) != timestamp:
        audit.issue("sensor_parent", f"{field}.{timestamp_key} does not match parent observation timestamp", path=path)


def validate_sensor_samples(release: Path, index: sqlite3.Connection, audit: Audit) -> None:
    """Validate optional contract-example payloads and their observation linkage."""
    path = release / "samples" / SENSOR_SAMPLE_NAME
    if not path.is_file():
        audit.warn("sensor_samples_absent", f"optional samples/{SENSOR_SAMPLE_NAME} is absent", path=str(path))
        return
    validators = load_sensor_schema_validators(release, audit)
    required = {"parent_observation_id", "canonical_events", "legacy_device_records", "raw_ring_window", "research_ecg_window"}
    try:
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                if not line.strip():
                    continue
                audit.counts["sensor_sample_rows"] += 1
                row_path = f"{path}:{line_number}"
                try:
                    sample = json.loads(line)
                except json.JSONDecodeError as exc:
                    audit.issue("sensor_sample_json", f"invalid JSON: {exc}", path=row_path)
                    continue
                if not isinstance(sample, dict) or set(sample) != required:
                    audit.issue("sensor_sample_shape", "sample must contain exactly the expected contract-example sections", path=row_path)
                    continue
                parent = _sample_parent(index, sample["parent_observation_id"])
                if parent is None:
                    audit.issue("sensor_parent", "parent_observation_id is absent from the observation table", path=row_path)
                    continue
                patient, timestamp = parent
                canonical_events = sample["canonical_events"]
                if not isinstance(canonical_events, list) or not canonical_events:
                    audit.issue("sensor_sample_shape", "canonical_events must be a non-empty list", path=row_path)
                else:
                    for number, event in enumerate(canonical_events):
                        event_path = f"{row_path}.canonical_events[{number}]"
                        validate_sensor_value(event, "canonical_events", validators, audit, event_path)
                        _same_sample_parent(event, patient, timestamp, "canonical_events", audit, event_path)
                raw = sample["raw_ring_window"]
                validate_sensor_value(raw, "raw_ring_window", validators, audit, f"{row_path}.raw_ring_window")
                _same_sample_parent(raw, patient, timestamp, "raw_ring_window", audit, f"{row_path}.raw_ring_window")
                legacy = sample["legacy_device_records"]
                if not isinstance(legacy, list) or not legacy:
                    audit.issue("sensor_sample_shape", "legacy_device_records must be a non-empty list", path=row_path)
                else:
                    for number, record in enumerate(legacy):
                        record_path = f"{row_path}.legacy_device_records[{number}]"
                        validate_sensor_value(record, "legacy_device_records", validators, audit, record_path)
                        _same_sample_parent(record, patient, timestamp, "legacy_device_records", audit, record_path)
                ecg = sample["research_ecg_window"]
                validate_sensor_value(ecg, "research_ecg_window", validators, audit, f"{row_path}.research_ecg_window")
                _same_sample_parent(ecg, patient, timestamp, "research_ecg_window", audit, f"{row_path}.research_ecg_window")
    except (OSError, EOFError) as exc:
        audit.issue("sensor_sample_gzip", f"cannot decompress/read: {type(exc).__name__}: {exc}", path=str(path))


def validate(release: Path, source_manifest: Path | None = None) -> dict[str, Any]:
    audit = Audit()
    release = release.resolve()
    if not release.is_dir():
        audit.issue("release_dir", "release directory does not exist", path=str(release))
        return {"ok": False, "release_dir": str(release), "counts": dict(audit.counts), "errors": audit.errors, "warnings": audit.warnings}
    with tempfile.TemporaryDirectory(prefix="saludata-release-validation-") as temporary:
        index = init_index(Path(temporary))
        try:
            profiles = profile_rows(release, audit)
            validate_observations(release, profiles, index, audit)
            validate_cases(release, profiles, index, audit)
            validate_sft(release,audit)
            validate_sensor_samples(release, index, audit)
            validate_manifest(release, audit)
            if source_manifest is not None:
                validate_source_manifest(source_manifest.resolve(), audit)
        finally:
            index.close()
    manifest_path=release/'manifest.json'
    return {"ok": not audit.errors, "release_dir": str(release),
            "manifest_sha256":sha256_file(manifest_path)[0] if manifest_path.is_file() else None,
            "counts": dict(sorted(audit.counts.items())), "errors": audit.errors, "warnings": audit.warnings}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release_dir", type=Path)
    parser.add_argument("--source-manifest", type=Path, help="optional private acquisition manifest; require actual_n >=500")
    parser.add_argument("--output", type=Path, help="optional audit JSON path outside release_dir")
    args = parser.parse_args()
    report = validate(args.release_dir, args.source_manifest)
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        output = args.output.resolve()
        release = args.release_dir.resolve()
        if output == release or release in output.parents:
            print("--output must be outside release_dir to keep validation read-only", file=sys.stderr)
            return 2
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")
    print(encoded, end="")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
