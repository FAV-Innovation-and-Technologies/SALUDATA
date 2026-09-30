#!/usr/bin/env python3
"""Streaming descriptive statistics for the synthetic research release.

This is descriptive quality metadata only.  It makes no clinical-validity or
diagnostic-performance claim and does not alter the release being summarized.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq

from build_dataset import METRICS


@dataclass
class RunningMetric:
    nonnull: int = 0
    missing: int = 0
    minimum: float | None = None
    maximum: float | None = None
    mean: float = 0.0
    m2: float = 0.0

    def add(self, value: Any) -> None:
        if value is None:
            self.missing += 1
            return
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            raise ValueError(f"metric has non-finite/non-numeric value: {value!r}")
        number = float(value)
        self.nonnull += 1
        self.minimum = number if self.minimum is None else min(self.minimum, number)
        self.maximum = number if self.maximum is None else max(self.maximum, number)
        delta = number - self.mean
        self.mean += delta / self.nonnull
        self.m2 += delta * (number - self.mean)

    def as_dict(self) -> dict[str, int | float | None]:
        return {
            "nonnull": self.nonnull,
            "missing": self.missing,
            "min": self.minimum,
            "max": self.maximum,
            "mean": self.mean if self.nonnull else None,
            "population_std": math.sqrt(self.m2 / self.nonnull) if self.nonnull else None,
        }


def _partition_stats(path: Path) -> dict[str, Any]:
    parquet = pq.ParquetFile(path)
    columns = set(parquet.schema_arrow.names)
    missing = set(METRICS) - columns
    if missing:
        raise ValueError(f"{path} lacks dataset metric columns: {sorted(missing)}")
    if "quality_status" not in columns:
        raise ValueError(f"{path} lacks quality_status")
    metrics = {name: RunningMetric() for name in METRICS}
    quality = Counter()
    rows = 0
    for batch in parquet.iter_batches(batch_size=8192, columns=[*METRICS, "quality_status"]):
        for row in batch.to_pylist():
            rows += 1
            status = row["quality_status"]
            quality["null" if status is None else str(status)] += 1
            for name, accumulator in metrics.items():
                accumulator.add(row[name])
    return {"rows": rows, "metrics": {name: accumulator.as_dict() for name, accumulator in metrics.items()}, "quality_status": dict(sorted(quality.items()))}


def _profile_counts(path: Path) -> dict[str, Any]:
    parquet = pq.ParquetFile(path)
    required = {"patient_ref", "split", "family_id", "scenario_id"}
    missing = required - set(parquet.schema_arrow.names)
    if missing:
        raise ValueError(f"{path} lacks profile columns: {sorted(missing)}")
    splits = Counter()
    families: set[str] = set()
    recipes: set[str] = set()
    rows = 0
    for batch in parquet.iter_batches(batch_size=8192, columns=sorted(required)):
        for row in batch.to_pylist():
            rows += 1
            splits[str(row["split"])] += 1
            families.add(str(row["family_id"]))
            recipes.add(str(row["scenario_id"]))
    return {"rows": rows, "split_counts": dict(sorted(splits.items())), "family_count": len(families), "scenario_recipe_count": len(recipes)}


def summarize(release: Path) -> dict[str, Any]:
    """Return JSON-compatible split/month metrics without loading tables wholesale."""
    release = Path(release)
    profiles_path = release / "data" / "profiles.parquet"
    observations_root = release / "data" / "observations"
    if not profiles_path.is_file() or not observations_root.is_dir():
        raise FileNotFoundError("release must contain data/profiles.parquet and data/observations")
    by_split_month: dict[str, dict[str, dict[str, Any]]] = {}
    total_rows = 0
    for path in sorted(observations_root.glob("*/*.parquet")):
        split, month = path.parent.name, path.stem
        if split in by_split_month and month in by_split_month[split]:
            raise ValueError(f"duplicate observation partition: {split}/{month}")
        result = _partition_stats(path)
        by_split_month.setdefault(split, {})[month] = result
        total_rows += result["rows"]
    if not by_split_month:
        raise FileNotFoundError("release has no observation parquet partitions")
    return {
        "schema_version": "saludata.dataset-statistics.v1",
        "clinical_validity": "Descriptive statistics for fully synthetic research data; no clinical validity, diagnostic performance, or real-patient inference is claimed.",
        "dataset_metrics": dict(METRICS),
        "profiles": _profile_counts(profiles_path),
        "observations": {"rows": total_rows, "by_split_month": by_split_month},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release", type=Path)
    parser.add_argument("--output", type=Path, help="optional explicit JSON output path")
    args = parser.parse_args()
    result = summarize(args.release)
    encoded = json.dumps(result, indent=2, sort_keys=True, allow_nan=False) + "\n"
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
    print(encoded, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
