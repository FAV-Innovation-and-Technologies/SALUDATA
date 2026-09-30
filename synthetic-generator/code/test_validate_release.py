import gzip
import hashlib
import json
import shutil
import sys
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

sys.path.insert(0, str(Path(__file__).parent))
import validate_release as validator
from sensor_exports import canonical_event, composition, ecg_window, flat_row, legacy_device_record, raw_window


PATIENT = "pt_" + "a" * 32
COMPOSITION = {
    "bmi": 24.3, "body_fat_percentage": 28.0, "body_water_percentage": 52.0,
    "muscle_percentage": 35.0, "lean_body_mass": 48.0, "bone_mass": 2.6,
    "protein_percentage": 17.0, "visceral_fat_index": 7.0,
    "basal_metabolic_rate": 1420.0, "body_age": 42.0,
}


def _hash(path: Path):
    payload = path.read_bytes()
    return {"sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload)}


def _write_release(root: Path, *, leak=False, future=False, bad_hash=False, missing_hr=False):
    profiles = root / "data" / "profiles.parquet"
    observations = root / "data" / "observations" / "train" / "2026-03.parquet"
    cases = root / "cases" / "train-2026-03.jsonl.gz"
    manifest = root / "manifest.json"
    observations.parent.mkdir(parents=True)
    cases.parent.mkdir(parents=True)
    manifest.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist([{
        "patient_ref": PATIENT, "split": "train", "scenario_id": "scn_a", "family_id": "fam_a",
        "age_years": 44, "sex_at_birth": "female", "height_cm": 166.0, "baseline_weight_kg": 67.0,
    }]), profiles)
    rows = []
    for number, timestamp in enumerate(("2026-03-03T10:00:00Z", "2026-03-04T10:00:00Z")):
        rows.append({
            "observation_id": f"obs_{number}", "patient_ref": PATIENT, "split": "train", "timestamp": timestamp,
            "hr": None if missing_hr and number == 0 else 70.0, "spo2": 98.0, "sbp": 120.0, "dbp": 75.0, "temp_c": 36.7,
            "respiration_rate": 15.0, "weight": 67.0, "activity_score": 0.4,
            "accelerometer_rms": 0.2, "step_count": 200, "bp_pulse": 45.0,
            **COMPOSITION,
        })
    pq.write_table(pa.Table.from_pylist(rows), observations)
    cutoff = "2026-03-04T09:00:00Z" if future else "2026-03-04T12:00:00Z"
    evidence_id = "obs_1" if future else "obs_0"
    evidence_timestamp = "2026-03-04T10:00:00Z" if future else "2026-03-03T10:00:00Z"
    input_value = {
        "patient": {"patient_ref": PATIENT}, "assessment_at": cutoff,
        "observations": [{"observation_id": evidence_id, "timestamp": evidence_timestamp, "measurements": {name: rows[0 if evidence_id == "obs_0" else 1][name] for name in validator.DATASET_METRICS}}],
        "history_summary": {
            "status": "available", "cutoff": "2026-03-03T10:00:00Z",
            "windows": {"7d": {"start": "2026-03-01T00:00:00Z", "end_exclusive": "2026-03-03T10:00:00Z"}},
            "last_observed_at": "2026-03-03T10:00:00Z",
        },
    }
    if leak:
        input_value["scenario_id"] = "must_not_be_here"
    case = {"case_id": "case_0", "split": "train", "input": input_value, "reference": {"evidence_ids": [evidence_id]}, "provenance": {"scenario_id": "scn_a", "family_id": "fam_a", "synthetic": True}}
    with gzip.open(cases, "wt", encoding="utf-8") as handle:
        handle.write(json.dumps(case) + "\n")
    files = {str(path.relative_to(root)): _hash(path) for path in (profiles, observations, cases)}
    if bad_hash:
        files[str(observations.relative_to(root))]["sha256"] = "0" * 64
    manifest.write_text(json.dumps({"patients": 1, "observation_rows": 2, "episodes": 1, "scenario_recipes": 1, "files": files}), encoding="utf-8")


def _refresh_manifest(root: Path) -> None:
    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["files"] = {
        str(path.relative_to(root)): _hash(path)
        for path in root.rglob("*")
        if path.is_file() and path != manifest_path
    }
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")


def _write_sensor_sample(root: Path, *, schemas: bool = True, corrupt_raw: bool = False) -> None:
    when = "2026-03-03T10:00:00Z"
    row = flat_row(PATIENT, when, seed=7)
    events = [canonical_event(row, kind) for kind in ("smart_ring", "blood_pressure_monitor", "smart_scale")]
    composition_values = composition(row["body_weight"], 170, 42, "other", seed=7, heart_rate=row["heart_rate"])
    legacy = [
        legacy_device_record("cosinuss_two", row),
        legacy_device_record("ihealth_bp7", row),
        legacy_device_record("ihealth_hs2s_pro", row, composition_values=composition_values),
    ]
    raw = raw_window(PATIENT, when, 7, row["heart_rate"], "rest_compatible")
    if corrupt_raw:
        raw["accelerometer"]["unit"] = "bad-unit"
    sample = {
        "parent_observation_id": "obs_0",
        "canonical_events": events,
        "legacy_device_records": legacy,
        "raw_ring_window": raw,
        "research_ecg_window": ecg_window(PATIENT, when, seed=7),
    }
    samples = root / "samples" / validator.SENSOR_SAMPLE_NAME
    samples.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(samples, "wt", encoding="utf-8") as handle:
        handle.write(json.dumps(sample) + "\n")
    if schemas:
        schema_root = root / "schemas"
        schema_root.mkdir(exist_ok=True)
        artifact_root = Path(__file__).resolve().parents[1]
        for name in ("legacy-device-record.schema.json", "research-ecg-window.schema.json"):
            shutil.copyfile(artifact_root / "schemas" / name, schema_root / name)
        workspace_root = artifact_root.parents[1]
        source_schema_root = workspace_root / ".worktrees" / "consolidate-independent-v2" / "contracts" / "v1" / "schemas"
        for name in ("measurement-event.schema.json", "raw-signal-window.schema.json"):
            shutil.copyfile(source_schema_root / name, schema_root / name)
    _refresh_manifest(root)


def test_valid_release_passes_and_does_not_add_files(tmp_path):
    _write_release(tmp_path)
    before = sorted(path.relative_to(tmp_path) for path in tmp_path.rglob("*"))
    report = validator.validate(tmp_path)
    after = sorted(path.relative_to(tmp_path) for path in tmp_path.rglob("*"))
    assert report["ok"], report["errors"]
    assert report["counts"]["profile_rows"] == 1
    assert report["counts"]["observation_rows"] == 2
    assert before == after


def test_input_leakage_and_future_evidence_fail(tmp_path):
    _write_release(tmp_path, leak=True, future=True)
    report = validator.validate(tmp_path)
    kinds = {error["kind"] for error in report["errors"]}
    assert "input_leakage" in kinds
    assert "case_future" in kinds


def test_manifest_checksum_and_source_calibration_failures(tmp_path):
    _write_release(tmp_path, bad_hash=True)
    source_manifest = tmp_path.parent / "source_manifest.json"
    source_manifest.write_text(json.dumps({"actual_n": 499, "valid_record_n_by_calibration_field": {}}), encoding="utf-8")
    report = validator.validate(tmp_path, source_manifest)
    kinds = {error["kind"] for error in report["errors"]}
    assert "manifest_hash" in kinds
    assert "source_calibration" in kinds


def test_null_observation_measurement_is_valid_and_counted(tmp_path):
    _write_release(tmp_path, missing_hr=True)
    # A null source HR remains an explicit null in case measurements.  The
    # frame uses research dataset metric names, not canonical API event names.
    case_path = tmp_path / "cases" / "train-2026-03.jsonl.gz"
    with gzip.open(case_path, "rt", encoding="utf-8") as handle:
        case = json.loads(handle.readline())
    case["input"]["observations"][0]["measurements"] = {
        name: (None if name == "hr" else (98.0 if name == "spo2" else 120.0 if name == "sbp" else 75.0 if name == "dbp" else 36.7 if name == "temp_c" else 15.0 if name == "respiration_rate" else 67.0 if name == "weight" else 0.4 if name == "activity_score" else 0.2 if name == "accelerometer_rms" else 200 if name == "step_count" else 45.0 if name == "bp_pulse" else COMPOSITION[name]))
        for name in validator.DATASET_METRICS
    }
    with gzip.open(case_path, "wt", encoding="utf-8") as handle:
        handle.write(json.dumps(case) + "\n")
    # Rebuild the root manifest checksum after the intentional fixture edit.
    manifest_path = tmp_path / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["files"]["cases/train-2026-03.jsonl.gz"] = _hash(case_path)
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    report = validator.validate(tmp_path)
    assert report["ok"], report["errors"]
    assert report["counts"]["missing_hr"] == 1


def test_composition_measurement_must_equal_referenced_observation(tmp_path):
    _write_release(tmp_path)
    case_path = tmp_path / "cases" / "train-2026-03.jsonl.gz"
    with gzip.open(case_path, "rt", encoding="utf-8") as handle:
        case = json.loads(handle.readline())
    case["input"]["observations"][0]["measurements"]["bmi"] = 99.0
    with gzip.open(case_path, "wt", encoding="utf-8") as handle:
        handle.write(json.dumps(case) + "\n")
    manifest_path = tmp_path / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["files"]["cases/train-2026-03.jsonl.gz"] = _hash(case_path)
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    report = validator.validate(tmp_path)
    assert "case_measurements" in {error["kind"] for error in report["errors"]}


def test_history_window_after_earliest_current_observation_fails_even_before_assessment(tmp_path):
    _write_release(tmp_path)
    case_path = tmp_path / "cases" / "train-2026-03.jsonl.gz"
    with gzip.open(case_path, "rt", encoding="utf-8") as handle:
        case = json.loads(handle.readline())
    # 11:00 is still before assessment_at (12:00), but enters the current
    # block because its only current observation begins at 10:00.
    case["input"]["history_summary"]["windows"]["7d"]["end_exclusive"] = "2026-03-03T11:00:00Z"
    with gzip.open(case_path, "wt", encoding="utf-8") as handle:
        handle.write(json.dumps(case) + "\n")
    _refresh_manifest(tmp_path)
    report = validator.validate(tmp_path)
    assert "history_window" in {error["kind"] for error in report["errors"]}


def test_sensor_contract_examples_validate_against_published_schemas(tmp_path):
    _write_release(tmp_path)
    _write_sensor_sample(tmp_path, schemas=True)
    report = validator.validate(tmp_path)
    assert report["ok"], report["errors"]
    assert report["counts"]["sensor_sample_rows"] == 1


def test_sensor_contract_schema_violation_fails(tmp_path):
    _write_release(tmp_path)
    _write_sensor_sample(tmp_path, schemas=True, corrupt_raw=True)
    report = validator.validate(tmp_path)
    assert "sensor_schema" in {error["kind"] for error in report["errors"]}


def test_sensor_examples_without_schemas_warn_but_remain_supported(tmp_path):
    _write_release(tmp_path)
    _write_sensor_sample(tmp_path, schemas=False)
    report = validator.validate(tmp_path)
    assert report["ok"], report["errors"]
    assert any(warning["kind"] == "sensor_schema_absent" for warning in report["warnings"])
