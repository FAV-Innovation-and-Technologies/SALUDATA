'use strict';

const FIXED_NOW = new Date('2026-08-12T08:00:00Z');
const PATIENT_REF = `pt_${'a'.repeat(32)}`;
const DEVICE_REF = `dev_${'b'.repeat(32)}`;

function quality(overrides = {}) {
  return Object.assign(
    {
      status: 'good',
      score: 0.98,
      coverage_ratio: 0.95,
      artifact_codes: [],
    },
    overrides
  );
}

function ringEvent(overrides = {}) {
  return Object.assign(
    {
      schema_version: 'saludata.measurement-event.v1',
      event_id: 'evt_ring_00000001',
      event_type: 'measurement.recorded',
      correlation_id: 'flow_ring_0000001',
      patient_ref: PATIENT_REF,
      device_ref: DEVICE_REF,
      occurred_at: '2026-08-12T07:30:00Z',
      produced_at: '2026-08-12T07:30:03Z',
      synthetic: true,
      mode: 'shadow',
      clinical_use: false,
      source: {
        kind: 'smart_ring',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_RING',
        firmware_ref: 'fw_demo_010200',
      },
      measurements: [
        { code: 'heart_rate', value: 72, unit: 'beats/min', quality: quality() },
        { code: 'oxygen_saturation', value: 97, unit: '%', quality: quality() },
        { code: 'accelerometer_rms', value: 0.12, unit: 'm/s2', quality: quality() },
      ],
      activity_context: {
        state: 'rest_compatible',
        confidence: 0.93,
        origin: 'sensor',
      },
      symptoms: [],
    },
    overrides
  );
}

function batch(event = ringEvent()) {
  return {
    schema_version: 'saludata.measurement-batch.v1',
    batch_id: 'batch_00000001',
    events: [event],
  };
}

module.exports = {
  DEVICE_REF,
  FIXED_NOW,
  PATIENT_REF,
  batch,
  quality,
  ringEvent,
};
