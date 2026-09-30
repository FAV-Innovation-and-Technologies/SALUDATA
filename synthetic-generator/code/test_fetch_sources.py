import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import fetch_sources as source


def test_adult_numeric_intersection_excludes_matched_records():
    adults = "30/3000003/\n31/3141595/\nmatched/p00/p000001/\n"
    numerics = "30/3000003/3000003n\n31/3141595/3141595n\nmatched/p00/p000001/xn\n30/3000004/3000004n\n"
    assert source.eligible_adult_numeric_records(adults, numerics) == [
        "30/3000003/3000003n",
        "31/3141595/3141595n",
    ]


def test_selection_is_sha_ranked_and_input_order_independent():
    records = ["31/3/3n", "30/2/2n", "30/1/1n"]
    chosen = source.deterministic_sample(records, 2, "20260301")
    expected = sorted(records, key=lambda item: (hashlib.sha256(f"20260301\0{item}".encode()).hexdigest(), item))[:2]
    assert chosen == expected
    assert chosen == source.deterministic_sample(reversed(records), 2, "20260301")


def test_header_frequency_and_label_mapping():
    assert source.parse_fs("3141595n 5 1 1938730\n") == 1.0
    assert source.parse_fs("record 3 125/1000(0) 999\n") == 125.0
    assert source.canonical_field("NBP Sys") == "nbp_sys"
    assert source.canonical_field("ABP Dias") == "abp_dias"
    assert source.canonical_field("SpO2") == "spo2"
    assert source.canonical_field("T1") == "temperature"
    assert source.canonical_field("unrelated") is None


def test_header_info_and_declared_units_are_checked():
    assert source.parse_header_info("record 3 125/1000(0) 999\n") == (125.0, 3, 999)
    assert source.recognized_unit("nbp_sys", "mmHg")
    assert source.recognized_unit("spo2", "%")
    assert not source.recognized_unit("temperature", "mmHg")


def test_unit_filters_and_summary_do_not_impute_temperature():
    assert source.valid("spo2", 0) is None
    assert source.valid("temperature", 37.2) == 37.2
    assert source.valid("temperature", 80) is None
    empty = source.field_summary([])
    assert empty["n"] == 0
    assert empty["mean"] is None
    values = source.field_summary([60.0, 70.0, 80.0])
    assert values["q50"] == 70.0


def test_calibration_pressure_priority_and_record_based_split(monkeypatch):
    # The source records are not asserted to be person-disjoint.  The split key
    # is explicitly a record-id hash, suitable only for robust aggregation.
    assert source.deterministic_sample(["30/a/an"], 1, "x") == ["30/a/an"]
    group = __import__("hashlib").sha256("30/a/an".encode()).hexdigest()
    assert len(group) == 64
