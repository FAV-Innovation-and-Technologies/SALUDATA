import sys
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

sys.path.insert(0, str(Path(__file__).parent))
import dataset_statistics as statistics


def _row(*, hr, quality):
    values = {metric: 1.0 for metric in statistics.METRICS}
    values.update({"hr": hr, "spo2": 98.0, "sbp": 120.0, "dbp": 75.0, "quality_status": quality})
    return values


def test_summarize_streaming_split_month_stats_and_profile_counts(tmp_path):
    profiles = tmp_path / "data" / "profiles.parquet"
    partition = tmp_path / "data" / "observations" / "train" / "2026-03.parquet"
    partition.parent.mkdir(parents=True)
    pq.write_table(pa.Table.from_pylist([
        {"patient_ref": "pt_1", "split": "train", "family_id": "family_a", "scenario_id": "recipe_a"},
        {"patient_ref": "pt_2", "split": "train", "family_id": "family_a", "scenario_id": "recipe_b"},
    ]), profiles)
    pq.write_table(pa.Table.from_pylist([_row(hr=60.0, quality="good"), _row(hr=None, quality="poor"), _row(hr=80.0, quality="good")]), partition)

    result = statistics.summarize(tmp_path)

    summary = result["observations"]["by_split_month"]["train"]["2026-03"]
    assert summary["rows"] == 3
    assert summary["metrics"]["hr"] == {"nonnull": 2, "missing": 1, "min": 60.0, "max": 80.0, "mean": 70.0, "population_std": 10.0}
    assert summary["quality_status"] == {"good": 2, "poor": 1}
    assert result["profiles"] == {"rows": 2, "split_counts": {"train": 2}, "family_count": 1, "scenario_recipe_count": 2}
    assert "no clinical validity" in result["clinical_validity"].lower()


def test_nonfinite_measurement_is_rejected(tmp_path):
    profiles = tmp_path / "data" / "profiles.parquet"
    partition = tmp_path / "data" / "observations" / "test" / "2026-05.parquet"
    partition.parent.mkdir(parents=True)
    pq.write_table(pa.Table.from_pylist([{"patient_ref": "pt_1", "split": "test", "family_id": "family_a", "scenario_id": "recipe_a"}]), profiles)
    pq.write_table(pa.Table.from_pylist([_row(hr=float("nan"), quality="good")]), partition)
    try:
        statistics.summarize(tmp_path)
    except ValueError as exc:
        assert "non-finite" in str(exc)
    else:
        raise AssertionError("expected a non-finite value to fail")
