#!/usr/bin/env python3
"""Create a *private* compact calibration cache from public MIMIC-III numerics.

This program intentionally never writes a source ``.dat`` file.  WFDB reads the
requested interval from PhysioNet's remote record endpoint (the WFDB client uses
HTTP byte ranges for streamed data); this program retains only aggregate
statistics and a small deterministic reservoir of joint scalar observations.

The output contains source record identifiers and is therefore a private work
product, not a file to include in a Zenodo release.  See SOURCE_RESEARCH.md.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import math
import random
import re
import shutil
import socket
import sys
import time
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable
from urllib.error import URLError
from urllib.request import Request, urlopen


BASE_URL = "https://physionet.org/files/mimic3wdb/1.0"
DATASET_URL = "https://physionet.org/content/mimic3wdb/1.0/"
DATASET_DOI = "https://doi.org/10.13026/c2607m"
LICENSE_URL = f"{BASE_URL}/LICENSE.txt"
DEFAULT_SEED = "20260301"
CANONICAL_FIELDS = (
    "hr",
    "spo2",
    "resp",
    "nbp_sys",
    "nbp_dias",
    "nbp_mean",
    "abp_sys",
    "abp_dias",
    "abp_mean",
    "temperature",
)

# Conservative physical/unit checks.  They clean common sentinel values (notably
# zero SpO2) but do not diagnose or impute a patient measurement.
RANGES = {
    "hr": (15.0, 300.0),
    "spo2": (50.0, 100.0),
    "resp": (1.0, 100.0),
    "nbp_sys": (30.0, 300.0),
    "nbp_dias": (10.0, 200.0),
    "nbp_mean": (20.0, 250.0),
    "abp_sys": (30.0, 300.0),
    "abp_dias": (10.0, 200.0),
    "abp_mean": (20.0, 250.0),
    # This is deliberately skin/device temperature only.  Absence remains null.
    "temperature": (20.0, 45.0),
}


@dataclass(frozen=True)
class Resource:
    name: str
    url: str
    path: Path
    sha256: str
    bytes: int


class SourceError(RuntimeError):
    """A source-file/network/format error that should be recorded, not hidden."""


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def fetch_small(url: str, max_bytes: int, timeout: int, retries: int) -> bytes:
    """Fetch metadata/header only, with a strict body-size limit and retries."""
    error: Exception | None = None
    for attempt in range(retries):
        try:
            request = Request(url, headers={"User-Agent": "SALUDATA-source-fetch/1.0"})
            with urlopen(request, timeout=timeout) as response:
                declared = response.headers.get("Content-Length")
                if declared and int(declared) > max_bytes:
                    raise SourceError(f"refusing {url}: Content-Length {declared} exceeds {max_bytes}")
                chunks: list[bytes] = []
                total = 0
                while True:
                    chunk = response.read(min(64 * 1024, max_bytes - total + 1))
                    if not chunk:
                        break
                    chunks.append(chunk)
                    total += len(chunk)
                    if total > max_bytes:
                        raise SourceError(f"refusing {url}: body exceeds {max_bytes} bytes")
                return b"".join(chunks)
        except (OSError, URLError, ValueError, SourceError) as exc:
            error = exc
            if attempt + 1 < retries:
                time.sleep(0.5 * (2**attempt))
    raise SourceError(f"could not fetch {url} after {retries} attempts: {error}")


def save_resource(name: str, url: str, destination: Path, max_bytes: int, timeout: int, retries: int) -> Resource:
    payload = fetch_small(url, max_bytes=max_bytes, timeout=timeout, retries=retries)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".partial")
    temporary.write_bytes(payload)
    temporary.replace(destination)
    return Resource(name, url, destination, sha256_bytes(payload), len(payload))


def normalize_record_line(line: str) -> str:
    return line.strip().lstrip("./")


def numeric_to_base(record: str) -> str:
    """Turn ``30/3000003/3000003n`` into the matching adult master record."""
    record = normalize_record_line(record)
    leaf = record.rsplit("/", 1)[-1]
    if not leaf.endswith("n"):
        raise ValueError(f"not a numeric record: {record}")
    return record[:-1]


def eligible_adult_numeric_records(adult_text: str, numerics_text: str) -> list[str]:
    # RECORDS-adults enumerates record *directories* (`30/3000003/`), while
    # RECORDS-numerics enumerates record names (`30/3000003/3000003n`).
    adult_directories = {
        normalize_record_line(line).rstrip("/")
        for line in adult_text.splitlines()
        if normalize_record_line(line) and not normalize_record_line(line).startswith("matched/")
    }
    numeric = [normalize_record_line(line) for line in numerics_text.splitlines() if normalize_record_line(line)]
    return sorted(
        record for record in numeric
        if record.rsplit("/", 1)[0] in adult_directories and not record.startswith("matched/")
    )


def deterministic_sample(records: Iterable[str], count: int, seed: str) -> list[str]:
    """Stable SHA-256 ranking; input order cannot affect the chosen records."""
    ranked = sorted(
        set(records),
        key=lambda record: (hashlib.sha256(f"{seed}\0{record}".encode()).hexdigest(), record),
    )
    return ranked[:count]


def record_url(record: str, suffix: str) -> str:
    """URL for a record's header or data. ``record`` ends with numeric ``n``."""
    return f"{BASE_URL}/{record}.{suffix}"


def parse_header_info(header: str) -> tuple[float, int, int]:
    first = next((line for line in header.splitlines() if line.strip() and not line.startswith("#")), "")
    tokens = first.split()
    if len(tokens) < 4:
        raise SourceError("WFDB header has no sampling-frequency token")
    # WFDB permits forms such as 1, 125/1000 and 1(0).
    match = re.match(r"([0-9]+(?:\.[0-9]+)?)", tokens[2])
    if not match:
        raise SourceError(f"cannot parse sampling frequency from {tokens[2]!r}")
    fs = float(match.group(1))
    if not math.isfinite(fs) or fs <= 0:
        raise SourceError(f"invalid sampling frequency {fs}")
    try:
        n_sig = int(tokens[1])
        sig_len = int(tokens[3])
    except ValueError as exc:
        raise SourceError(f"cannot parse WFDB n_sig/sig_len from {first!r}") from exc
    if n_sig < 1 or sig_len < 1:
        raise SourceError(f"invalid WFDB n_sig/sig_len: {n_sig}/{sig_len}")
    return fs, n_sig, sig_len


def parse_fs(header: str) -> float:
    """Compatibility helper used by tests and callers that only require fs."""
    return parse_header_info(header)[0]


def normalize_label(label: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", label.upper())


def canonical_field(label: str) -> str | None:
    """Map common Philips/WFDB labels; unrecognised and rare labels stay absent."""
    token = normalize_label(label)
    if token in {"HR", "HEARTRATE"}:
        return "hr"
    if token in {"SPO2", "SATO2", "O2SAT"}:
        return "spo2"
    if token in {"RESP", "RESPRATE", "RR"}:
        return "resp"
    for prefix, fields in (("NBP", ("nbp_sys", "nbp_dias", "nbp_mean")), ("ABP", ("abp_sys", "abp_dias", "abp_mean"))):
        if token.startswith(prefix):
            if any(word in token for word in ("SYS", "SYST")):
                return fields[0]
            if any(word in token for word in ("DIA", "DIAS")):
                return fields[1]
            if "MEAN" in token:
                return fields[2]
    # T1/T2 are monitor temperature channels; no temperature is fabricated when
    # none is present.  Prefer T1 deterministically when both occur.
    if token in {"T1", "T2", "TEMP", "TEMPERATURE", "TBLOOD", "TSKIN"}:
        return "temperature"
    return None


def selected_channels(sig_names: list[str]) -> dict[str, int]:
    selected: dict[str, int] = {}
    for index, name in enumerate(sig_names):
        field = canonical_field(str(name))
        if field is not None and field not in selected:
            selected[field] = index
    return selected


def valid(field: str, value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    lower, upper = RANGES[field]
    if not math.isfinite(parsed) or not lower <= parsed <= upper:
        return None
    return parsed


def recognized_unit(field: str, unit: str | None) -> bool:
    """Only retain a field when its monitor-declared physical unit is plausible."""
    token = normalize_label(unit or "")
    allowed = {
        "hr": {"BPM", "PM", "MIN1", "1MIN"},
        "spo2": {"" , "PERCENT"},  # ``%`` normalizes to empty.
        "resp": {"BPM", "PM", "MIN1", "1MIN"},
        "nbp_sys": {"MMHG"}, "nbp_dias": {"MMHG"}, "nbp_mean": {"MMHG"},
        "abp_sys": {"MMHG"}, "abp_dias": {"MMHG"}, "abp_mean": {"MMHG"},
        "temperature": {"C", "DEGC", "CELSIUS"},
    }
    return token in allowed[field]


def field_summary(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"n": 0, "min": None, "max": None, "mean": None, "std": None, "q05": None, "q50": None, "q95": None}
    ordered = sorted(values)
    mean = sum(ordered) / len(ordered)
    variance = sum((value - mean) ** 2 for value in ordered) / len(ordered)

    def quantile(q: float) -> float:
        position = (len(ordered) - 1) * q
        left = int(position)
        right = min(left + 1, len(ordered) - 1)
        return ordered[left] + (ordered[right] - ordered[left]) * (position - left)

    return {
        "n": len(ordered), "min": ordered[0], "max": ordered[-1], "mean": mean,
        "std": math.sqrt(variance), "q05": quantile(0.05), "q50": quantile(0.50), "q95": quantile(0.95),
    }


def reservoir_append(reservoir: list[dict[str, float | None]], item: dict[str, float | None], seen: int, limit: int, rng: random.Random) -> None:
    if len(reservoir) < limit:
        reservoir.append(item)
        return
    replacement = rng.randrange(seen)
    if replacement < limit:
        reservoir[replacement] = item


def summarize_record(record: str, header: str, *, window_hours: float, max_record_bytes: int, joint_limit: int, min_joint_samples: int, timeout: int, retries: int) -> dict[str, Any]:
    """Read a capped remote interval with wfdb and return only compact features."""
    try:
        import wfdb  # Imported here so unit tests and --dry-run need no dependency.
    except ImportError as exc:  # pragma: no cover - exercised by CLI environment
        raise SourceError("wfdb is required: install -r code/requirements-source-fetch.txt") from exc

    fs, n_sig, sig_len = parse_header_info(header)
    # A float64-ish worst case protects RAM/network even if the source format is
    # more compact.  Numeric 1-Hz records normally sit far below this bound.
    window_samples = min(sig_len, max(1, int(fs * window_hours * 3600)))
    estimated_max = window_samples * n_sig * 8
    if estimated_max > max_record_bytes:
        window_samples = max(1, min(sig_len, max_record_bytes // (n_sig * 8)))
    pn_dir, record_name = record.rsplit("/", 1)
    read_error: Exception | None = None
    # wfdb's remote reader streams dat files via HTTP RangeTransfer.  The small
    # ``sampto`` bound limits its requested range; socket's default timeout and
    # this retry loop protect the acquisition job from transient network faults.
    socket.setdefaulttimeout(timeout)
    for attempt in range(retries):
        try:
            wf_record = wfdb.rdrecord(
                record_name,
                pn_dir=f"mimic3wdb/{pn_dir}",
                sampfrom=0,
                sampto=window_samples,
                physical=True,
                return_res=32,
            )
            break
        except Exception as exc:  # wfdb owns transport/status-specific exception types.
            read_error = exc
            if attempt + 1 < retries:
                time.sleep(0.5 * (2**attempt))
    else:
        raise SourceError(f"wfdb read failed after {retries} attempts: {type(read_error).__name__}: {read_error}") from read_error

    names = [str(name) for name in (wf_record.sig_name or [])]
    raw_channels = selected_channels(names)
    units = [str(unit or "") for unit in (wf_record.units or [])]
    channels = {
        field: index for field, index in raw_channels.items()
        if index < len(units) and recognized_unit(field, units[index])
    }
    if len(channels) < 2:
        raise SourceError(f"fewer than two recognised numeric fields: {names}")
    signal = wf_record.p_signal
    if signal is None:
        raise SourceError("WFDB returned no physical samples")

    values: dict[str, list[float]] = defaultdict(list)
    joint: list[dict[str, float | None]] = []
    rng = random.Random(int(hashlib.sha256(record.encode()).hexdigest(), 16))
    joint_seen = 0
    for row in signal:
        sample: dict[str, float | None] = {field: None for field in CANONICAL_FIELDS}
        for field, column in channels.items():
            measurement = valid(field, row[column])
            sample[field] = measurement
            if measurement is not None:
                values[field].append(measurement)
        if sum(value is not None for value in sample.values()) >= 2:
            joint_seen += 1
            reservoir_append(joint, sample, joint_seen, joint_limit, rng)

    if joint_seen < min_joint_samples:
        raise SourceError(
            f"insufficient jointly observed finite measurements: {joint_seen} < {min_joint_samples}"
        )
    # The calibration view has one conventional pressure source per record.  It
    # never combines ABP and NBP observations at the same timestamp: invasive
    # ABP is preferred when present, otherwise the monitor's NBP field is used.
    calibration_sources = {
        "hr": "hr",
        "spo2": "spo2",
        "rr": "resp",
        "temp": "temperature",
        "sbp": "nbp_sys" if values["nbp_sys"] else "abp_sys",
        "dbp": "nbp_dias" if values["nbp_dias"] else "abp_dias",
        "mbp": "nbp_mean" if values["nbp_mean"] else "abp_mean",
    }
    stats = {field: field_summary(values[field]) for field in CANONICAL_FIELDS}
    calibration = {
        field: {"source_field": source, **stats[source]}
        for field, source in calibration_sources.items()
    }
    group_hash = hashlib.sha256(record.encode("utf-8")).hexdigest()
    split_bucket = int(group_hash[:8], 16) % 10
    return {
        "record_id": record,
        "split_group_hash": group_hash,
        "split": "train" if split_bucket < 8 else "validation" if split_bucket == 8 else "test",
        "header_sha256": sha256_bytes(header.encode("utf-8")),
        "header_url": record_url(record, "hea"),
        "data_url": record_url(record, "dat"),
        "sampling_frequency_hz": fs,
        "requested_samples": window_samples,
        "returned_samples": int(signal.shape[0]),
        "joint_observations": joint_seen,
        "channels": {field: {"label": names[index], "unit": units[index]} for field, index in channels.items()},
        "source_n_sig": n_sig,
        "source_sig_len": sig_len,
        "returned_data_sha256": hashlib.sha256(signal.astype("float32", copy=False).tobytes()).hexdigest(),
        "temperature_available": "temperature" in channels,
        "stats": stats,
        "calibration": calibration,
        "joint_samples": joint,
    }


def atomic_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".partial")
    temp.write_text(json.dumps(payload, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8")
    temp.replace(path)


def write_optional_parquet(path: Path, summaries: list[dict[str, Any]]) -> str:
    """Write flattened summaries if pyarrow is available; JSON is always written."""
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        return "not-written (pyarrow unavailable)"
    rows: list[dict[str, Any]] = []
    for summary in summaries:
        row = {key: value for key, value in summary.items() if key not in {"stats", "calibration", "joint_samples", "channels"}}
        row["channels_json"] = json.dumps(summary["channels"], sort_keys=True)
        for field, stats in summary["stats"].items():
            for name, value in stats.items():
                row[f"{field}_{name}"] = value
        # Stable convenience columns for downstream calibration: hr/spo2/sbp/
        # dbp/mbp/rr/temp plus mean/std/quantiles.  ``*_source_field`` exposes
        # whether a pressure statistic was ABP or NBP.
        for field, stats in summary["calibration"].items():
            for name, value in stats.items():
                row[f"{field}_{name}"] = value
        rows.append(row)
    pq.write_table(pa.Table.from_pylist(rows), path)
    return "written"


def write_joint_parquet(path: Path, rows: list[dict[str, Any]]) -> str:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        return "not-written (pyarrow unavailable)"
    pq.write_table(pa.Table.from_pylist(rows), path, compression="zstd")
    return "written"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    default_cache = Path(__file__).resolve().parent.parent / "private_source_cache"
    parser.add_argument("--work-dir", type=Path, default=default_cache, help="private cache; never publish it to Zenodo")
    parser.add_argument("--count", type=int, default=1024, help="deterministically selected adult numeric records")
    parser.add_argument("--seed", default=DEFAULT_SEED, help="SHA ranking seed (default: 20260301)")
    parser.add_argument("--window-hours", type=float, default=6.0, help="maximum source interval per record")
    parser.add_argument("--workers", type=int, default=4, choices=range(1, 5), help="HTTP/WFDB workers (1--4)")
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--max-record-bytes", type=int, default=32 * 1024 * 1024, help="conservative in-memory interval bound")
    parser.add_argument("--joint-limit", type=int, default=128, help="max retained joint rows per record")
    parser.add_argument("--min-joint-samples", type=int, default=60, help="reject records with fewer valid joint numeric observations")
    parser.add_argument("--dry-run", action="store_true", help="fetch metadata/select records but do not read samples")
    return parser


def run(args: argparse.Namespace) -> int:
    if args.count < 1 or args.window_hours <= 0 or args.joint_limit < 1 or args.min_joint_samples < 1:
        raise ValueError("count, window-hours, joint-limit and min-joint-samples must be positive")
    work_dir: Path = args.work_dir.resolve()
    metadata_dir = work_dir / "metadata"
    header_dir = work_dir / "headers"
    output_dir = work_dir / "outputs"
    # Guard against an accidentally public-ish destination name; this is not a
    # security boundary but makes the required review explicit.
    (work_dir / "DO_NOT_PUBLISH_SOURCE_CACHE.txt").parent.mkdir(parents=True, exist_ok=True)
    (work_dir / "DO_NOT_PUBLISH_SOURCE_CACHE.txt").write_text(
        "Contains MIMIC source identifiers and calibration metadata. Exclude from Zenodo releases.\n", encoding="utf-8"
    )
    resources = [
        save_resource("RECORDS-adults", f"{BASE_URL}/RECORDS-adults", metadata_dir / "RECORDS-adults", 2 * 1024 * 1024, args.timeout, args.retries),
        save_resource("RECORDS-numerics", f"{BASE_URL}/RECORDS-numerics", metadata_dir / "RECORDS-numerics", 4 * 1024 * 1024, args.timeout, args.retries),
        save_resource("LICENSE.txt", LICENSE_URL, metadata_dir / "LICENSE.txt", 128 * 1024, args.timeout, args.retries),
    ]
    adult_text = resources[0].path.read_text(encoding="utf-8")
    numerics_text = resources[1].path.read_text(encoding="utf-8")
    eligible = eligible_adult_numeric_records(adult_text, numerics_text)
    selected = deterministic_sample(eligible, args.count, args.seed)
    if not selected:
        raise SourceError("no adult numeric records found in inventories")

    manifest: dict[str, Any] = {
        "created_at": utc_now(), "private_only": True, "dataset": "MIMIC-III Waveform Database v1.0",
        "dataset_url": DATASET_URL, "doi": DATASET_DOI, "license": "ODbL-1.0", "license_url": LICENSE_URL,
        "selection": {"seed": args.seed, "eligible_adult_numeric_records": len(eligible), "requested": args.count, "selected": len(selected), "algorithm": "sort SHA-256(seed + NUL + record_id), then take first N"},
        "bounds": {"window_hours": args.window_hours, "max_record_bytes": args.max_record_bytes, "workers": args.workers, "retries": args.retries, "timeout_seconds": args.timeout, "joint_limit": args.joint_limit, "min_joint_samples": args.min_joint_samples},
        "resources": [asdict(resource) | {"path": str(resource.path)} for resource in resources],
        "selected_record_ids": selected, "successful": [], "failures": [],
    }

    headers: dict[str, str] = {}
    def fetch_header(record: str) -> tuple[str, str]:
        header_resource = save_resource(record, record_url(record, "hea"), header_dir / f"{record.replace('/', '__')}.hea", 256 * 1024, args.timeout, args.retries)
        return record, header_resource.path.read_text(encoding="utf-8", errors="replace")

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_headers = {executor.submit(fetch_header, record): record for record in selected}
        for number, future in enumerate(concurrent.futures.as_completed(future_headers), start=1):
            record = future_headers[future]
            try:
                record, header = future.result()
                headers[record] = header
            except Exception as exc:
                manifest["failures"].append({"record_id": record, "stage": "header", "error": f"{type(exc).__name__}: {exc}"})
            if number % 32 == 0 or number == len(selected):
                print(f"header progress {number}/{len(selected)} (usable={len(headers)})", file=sys.stderr, flush=True)

    if args.dry_run:
        manifest["successful"] = [{"record_id": record, "stage": "header-only"} for record in sorted(headers)]
        atomic_json(output_dir / "source_manifest.json", manifest)
        print(json.dumps({"selected": len(selected), "headers": len(headers), "dry_run": True, "work_dir": str(work_dir)}))
        return 0

    summaries: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_map = {
            executor.submit(summarize_record, record, header, window_hours=args.window_hours, max_record_bytes=args.max_record_bytes, joint_limit=args.joint_limit, min_joint_samples=args.min_joint_samples, timeout=args.timeout, retries=args.retries): record
            for record, header in headers.items()
        }
        for future in concurrent.futures.as_completed(future_map):
            record = future_map[future]
            try:
                summary = future.result()
                summaries.append(summary)
                manifest["successful"].append({
                    "record_id": record,
                    "returned_samples": summary["returned_samples"],
                    "sampling_frequency_hz": summary["sampling_frequency_hz"],
                    "header_sha256": summary["header_sha256"],
                    "returned_data_sha256": summary["returned_data_sha256"],
                    "channels": summary["channels"],
                })
            except Exception as exc:
                manifest["failures"].append({"record_id": record, "stage": "samples", "error": f"{type(exc).__name__}: {exc}"})
            completed = len(manifest["successful"]) + sum(1 for item in manifest["failures"] if item["stage"] == "samples")
            if completed % 32 == 0 or completed == len(headers):
                print(f"sample progress {completed}/{len(headers)} (successful={len(manifest['successful'])})", file=sys.stderr, flush=True)
    summaries.sort(key=lambda item: item["record_id"])
    manifest["actual_n"] = len(summaries)
    manifest["temperature_available_n"] = sum(bool(item["temperature_available"]) for item in summaries)
    manifest["valid_record_n_by_calibration_field"] = {
        field: sum(item["calibration"][field]["n"] > 0 for item in summaries)
        for field in ("hr", "spo2", "sbp", "dbp", "mbp", "rr", "temp")
    }
    manifest["notice"] = "Private calibration cache. It contains source IDs and must not be included in a Zenodo release."
    atomic_json(output_dir / "source_manifest.json", manifest)
    atomic_json(output_dir / "private_record_summaries.json", summaries)
    joint_rows = [
        {"record_id": summary["record_id"], "sampling_frequency_hz": summary["sampling_frequency_hz"], **sample}
        for summary in summaries for sample in summary["joint_samples"]
    ]
    atomic_json(output_dir / "private_joint_scalar_samples.json", joint_rows)
    parquet_status = write_optional_parquet(output_dir / "private_record_summaries.parquet", summaries)
    joint_parquet_status = write_joint_parquet(output_dir / "private_joint_scalar_samples.parquet", joint_rows)
    print(json.dumps({"selected": len(selected), "header_successes": len(headers), "actual_n": len(summaries), "failures": len(manifest["failures"]), "temperature_available_n": manifest["temperature_available_n"], "parquet": parquet_status, "joint_parquet": joint_parquet_status, "work_dir": str(work_dir)}))
    # The requested acceptance threshold is intentionally explicit: callers must
    # not mistake a partial harvest for a whole-database calibration.
    return 0 if len(summaries) >= 500 else 2


def main() -> int:
    args = build_parser().parse_args()
    try:
        return run(args)
    except (SourceError, ValueError) as exc:
        print(f"source fetch failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
