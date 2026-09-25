'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateMeasurementBatch } = require('../src/monitoring/measurement-contract');
const {
  FIXED_NOW,
  batch,
  quality,
  ringEvent,
} = require('./fixtures/measurement-fixtures');

const ENGINE_ROOT = process.env.BIOSIGNAL_ENGINE_ROOT || path.resolve(__dirname, '../.external/biosignal-anomaly-engine');
const CONSUMER_ADAPTER = path.join(ENGINE_ROOT, 'demo', 'contract_events.py');

function cuffEvent(measurements) {
  return ringEvent({
    event_id: 'evt_parity_cuff_0001',
    source: {
      kind: 'blood_pressure_monitor',
      transport: 'bluetooth_le',
      manufacturer_code: 'SYNTH_BP',
    },
    measurements,
  });
}

function scaleEvent(measurements) {
  return ringEvent({
    event_id: 'evt_parity_scale_001',
    source: {
      kind: 'smart_scale',
      transport: 'bluetooth_le',
      manufacturer_code: 'SYNTH_SCALE',
    },
    measurements,
  });
}

function apiAccepts(event) {
  try {
    validateMeasurementBatch(batch(event), { now: FIXED_NOW });
    return true;
  } catch (error) {
    void error;
    return false;
  }
}

function consumerResults(events) {
  const script = [
    'import json, sys',
    'sys.path.insert(0, sys.argv[1])',
    'from demo.contract_events import normalize_measurement_event',
    'results = []',
    'for event in json.load(sys.stdin):',
    '    try:',
    '        normalize_measurement_event(event)',
    '        results.append(True)',
    '    except (TypeError, ValueError):',
    '        results.append(False)',
    'print(json.dumps(results))',
  ].join('\n');
  const execution = spawnSync(process.env.PYTHON || 'python3', ['-c', script, ENGINE_ROOT], {
    input: JSON.stringify(events),
    encoding: 'utf8',
  });
  if (execution.status !== 0) {
    throw new Error('Unable to execute the monitoring consumer parity adapter.');
  }
  return JSON.parse(execution.stdout);
}

const parityTest = fs.existsSync(CONSUMER_ADAPTER) ? test : test.skip;

describe('measurement producer/consumer semantic parity', () => {
  parityTest('matches demo/contract_events.py for closed-v1 source requirements', () => {
    const systolic = {
      code: 'systolic_blood_pressure',
      value: 145,
      unit: 'mm[Hg]',
      quality: quality(),
    };
    const diastolic = {
      code: 'diastolic_blood_pressure',
      value: 91,
      unit: 'mm[Hg]',
      quality: quality(),
    };
    const weight = {
      code: 'body_weight',
      value: 74.2,
      unit: 'kg',
      quality: quality(),
    };
    const pulse = {
      code: 'heart_rate',
      value: 72,
      unit: 'beats/min',
      quality: quality(),
    };
    const cases = [
      { expected: true, event: ringEvent() },
      { expected: true, event: cuffEvent([systolic, diastolic]) },
      { expected: false, event: cuffEvent([systolic]) },
      { expected: false, event: cuffEvent([diastolic]) },
      { expected: true, event: scaleEvent([weight]) },
      { expected: false, event: scaleEvent([pulse]) },
    ];

    const producer = cases.map(item => apiAccepts(item.event));
    const consumer = consumerResults(cases.map(item => item.event));
    const expected = cases.map(item => item.expected);
    expect(producer).toEqual(expected);
    expect(consumer).toEqual(expected);
    expect(producer).toEqual(consumer);
  });
});
