"""Pure-unit tests for the synthetic Zenodo research helpers."""

import importlib.util
from pathlib import Path
import unittest


MODULE = Path(__file__).with_name("sensor_exports.py")
SPEC = importlib.util.spec_from_file_location("sensor_exports", MODULE)
sensor_exports = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(sensor_exports)

PATIENT = "pt_0123456789abcdef0123456789abcdef"
WHEN = "2026-04-10T12:00:00Z"


class SensorExportTests(unittest.TestCase):
    def test_flat_row_and_all_canonical_device_events(self):
        row = sensor_exports.flat_row(PATIENT, WHEN, seed=9)
        self.assertEqual(set(sensor_exports.CANONICAL_METRICS), {
            "heart_rate", "oxygen_saturation", "systolic_blood_pressure", "diastolic_blood_pressure",
            "body_weight", "accelerometer_rms", "activity_score", "step_count",
        })
        for devicekind in ("smart_ring", "blood_pressure_monitor", "smart_scale"):
            event = sensor_exports.canonical_event(row, devicekind)
            self.assertEqual(event["schema_version"], "saludata.measurement-event.v1")
            self.assertEqual(event["occurred_at"], WHEN)
            self.assertEqual(event["produced_at"], WHEN)
            self.assertEqual(event["source"]["kind"], devicekind)
            self.assertTrue(event["synthetic"])
            sensor_exports.validate_canonical_event_shape(event)

    def test_raw_window_is_ten_seconds_at_25_hz(self):
        window = sensor_exports.raw_window(PATIENT, WHEN, 3, 72, "rest_compatible", poor_ppg=True)
        self.assertEqual(len(window["ppg"]["samples"]), 250)
        self.assertEqual(len(window["accelerometer"]["x"]), 250)
        self.assertEqual(window["ppg"]["sample_rate_hz"], 25)
        self.assertEqual(window["accelerometer"]["unit"], "g")
        sensor_exports.validate_raw_window_shape(window)

    def test_raw_window_shape_allows_absent_optional_ppg(self):
        window = sensor_exports.raw_window(PATIENT, WHEN, 4, 72, "rest_compatible")
        window["ppg"] = None
        sensor_exports.validate_raw_window_shape(window)

    def test_legacy_and_ecg_records_are_separate_research_records(self):
        row = sensor_exports.flat_row(PATIENT, WHEN, seed=2)
        values = sensor_exports.composition(row["body_weight"], 170, 42, "other", seed=2, heart_rate=row["heart_rate"])
        hs2s = sensor_exports.legacy_device_record("ihealth_hs2s_pro", row, composition_values=values)
        ecg = sensor_exports.ecg_window(PATIENT, WHEN, seed=2)
        self.assertEqual(len(hs2s["measurements"]), 12)
        self.assertTrue(hs2s["provenance"]["not_a_vendor_capture"])
        self.assertEqual((ecg["duration_seconds"], ecg["sample_rate_hz"], len(ecg["samples_mv"])), (10, 125, 1250))
        self.assertEqual(ecg["provenance"]["hypothetical_sensor"], "unknown")

    def test_release_period_is_enforced(self):
        with self.assertRaises(ValueError):
            sensor_exports.flat_row(PATIENT, "2026-06-01T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
