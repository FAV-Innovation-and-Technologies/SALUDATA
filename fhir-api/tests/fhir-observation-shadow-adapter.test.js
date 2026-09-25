'use strict';

const { EventEmitter } = require('events');
const {
  PATIENT_COLLECTION,
  createFhirObservationShadowAdapter,
  deterministicDeviceRef,
  measurementFromObservation,
  resolveCanonicalMonitoringPatientRef,
  supportedMeasurementsFromFhir,
} = require('../src/routes/fhir-observation-shadow-adapter');

const FIXED_NOW = new Date('2026-09-02T09:00:00.000Z');
const CANONICAL_PATIENT_REF = `pt_${'a'.repeat(32)}`;
const CLINICIAN_ACTOR_REF = `usr_${'b'.repeat(32)}`;
const SUPABASE_USER_ID = '6a1e7e91-64d0-4f21-9f18-3e58af553663';

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function valueAt(document, path) {
  return path
    .split('.')
    .reduce((value, key) => (value === null || value === undefined ? undefined : value[key]), document);
}

function sameValue(left, right) {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return left === right;
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some(clause => matches(document, clause));
    }
    const actual = valueAt(document, key);
    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected)) {
      if (Object.prototype.hasOwnProperty.call(expected, '$in')) {
        return expected.$in.includes(actual);
      }
      if (Object.prototype.hasOwnProperty.call(expected, '$lte')) {
        return actual <= expected.$lte;
      }
    }
    return sameValue(actual, expected);
  });
}

function applyUpdate(document, update, inserted) {
  if (inserted && update.$setOnInsert) {
    Object.assign(document, clone(update.$setOnInsert));
  }
  if (update.$set) {
    Object.assign(document, clone(update.$set));
  }
  if (update.$inc) {
    Object.entries(update.$inc).forEach(([key, value]) => {
      document[key] = (document[key] || 0) + value;
    });
  }
  if (update.$unset) {
    Object.keys(update.$unset).forEach(key => delete document[key]);
  }
}

class FakeCollection {
  constructor() {
    this.documents = [];
    this.indexes = [];
  }

  async createIndex(specification, options) {
    this.indexes.push({ specification, options });
    return options.name;
  }

  async findOne(filter) {
    return clone(this.documents.find(document => matches(document, filter)) || null);
  }

  async updateOne(filter, update, options = {}) {
    let document = this.documents.find(item => matches(item, filter));
    let inserted = false;
    if (!document && options.upsert) {
      document = {};
      Object.entries(filter).forEach(([key, value]) => {
        if (!key.startsWith('$') && !(value && typeof value === 'object' && !(value instanceof Date))) {
          document[key] = clone(value);
        }
      });
      this.documents.push(document);
      inserted = true;
    }
    if (!document) {
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }
    applyUpdate(document, update, inserted);
    return {
      matchedCount: inserted ? 0 : 1,
      modifiedCount: 1,
      upsertedCount: inserted ? 1 : 0,
    };
  }

  async findOneAndUpdate(filter, update) {
    const document = this.documents.find(item => matches(item, filter));
    if (!document) {
      return null;
    }
    applyUpdate(document, update, false);
    return clone(document);
  }
}

class FakeDb {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new FakeCollection());
    }
    return this.collections.get(name);
  }
}

function logger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function heartRateObservation(overrides = {}) {
  return Object.assign(
    {
      resourceType: 'Observation',
      status: 'final',
      subject: { reference: 'Patient/demo-patient-001' },
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4' }] },
      effectiveDateTime: '2026-09-02T08:59:00.000Z',
      valueQuantity: { value: 125, system: 'http://unitsofmeasure.org', code: '/min' },
    },
    overrides,
  );
}

function weightObservation(overrides = {}) {
  return Object.assign(
    {
      resourceType: 'Observation',
      status: 'final',
      subject: { reference: 'Patient/demo-patient-001' },
      code: { coding: [{ system: 'http://loinc.org', code: '29463-7' }] },
      effectiveDateTime: '2026-09-02T08:58:00.000Z',
      valueQuantity: { value: 111.6, system: 'http://unitsofmeasure.org', code: 'kg' },
    },
    overrides,
  );
}

async function waitFor(assertion) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      if (attempt === 99) {
        throw error;
      }
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}

describe('FHIR Observation shadow adapter', () => {
  test('maps final LOINC heart-rate and weight Observations without exposing identifiers', () => {
    const candidates = supportedMeasurementsFromFhir({
      resourceType: 'Bundle',
      entry: [{ resource: heartRateObservation() }, { resource: weightObservation() }],
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        subjectReference: 'Patient/demo-patient-001',
        measurement: expect.objectContaining({ code: 'heart_rate', value: 125, unit: 'beats/min' }),
      }),
      expect.objectContaining({
        subjectReference: 'Patient/demo-patient-001',
        measurement: expect.objectContaining({ code: 'body_weight', value: 111.6, unit: 'kg' }),
      }),
    ]);
    expect(measurementFromObservation(heartRateObservation({ status: 'preliminary' }))).toBeNull();
    expect(measurementFromObservation(heartRateObservation({ subject: { reference: 'Patient/' } }))).toBeNull();
  });

  test('ingests through the normal outbox without reading environment mode flags', async () => {
    const db = new FakeDb();
    const kafkaManager = { send: jest.fn().mockResolvedValue(undefined) };
    const resolveMonitoringPatientRef = jest.fn().mockResolvedValue(CANONICAL_PATIENT_REF);
    const adapter = createFhirObservationShadowAdapter({
      db,
      kafkaManager,
      logger: logger(),
      now: () => new Date(FIXED_NOW),
      resolveMonitoringPatientRef,
    });

    const result = await adapter.ingest({
      resourceType: 'Bundle',
      entry: [{ resource: heartRateObservation() }, { resource: weightObservation() }],
    });

    expect(result).toMatchObject({ accepted: 2, ack: { mode: 'shadow', clinical_use: false } });
    expect(kafkaManager.send).toHaveBeenCalledTimes(2);
    const publishedEvents = kafkaManager.send.mock.calls.map(([call]) => call.message);
    expect(publishedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          synthetic: true,
          mode: 'shadow',
          clinical_use: false,
          measurements: [expect.objectContaining({ code: 'heart_rate', value: 125 })],
        }),
        expect.objectContaining({
          synthetic: true,
          mode: 'shadow',
          clinical_use: false,
          measurements: [expect.objectContaining({ code: 'body_weight', value: 111.6 })],
        }),
      ]),
    );
    publishedEvents.forEach(event => {
      expect(event.patient_ref).toBe(CANONICAL_PATIENT_REF);
      expect(event.device_ref).toMatch(/^dev_[a-f0-9]{32}$/);
      expect(JSON.stringify(event)).not.toContain('demo-patient-001');
    });
    expect(resolveMonitoringPatientRef).toHaveBeenCalledWith(
      expect.objectContaining({ patientReference: 'Patient/demo-patient-001' }),
    );
    expect(publishedEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        device_ref: deterministicDeviceRef(CANONICAL_PATIENT_REF, 'smart_ring'),
        source: expect.objectContaining({ kind: 'smart_ring' }),
      }),
      expect.objectContaining({
        device_ref: deterministicDeviceRef(CANONICAL_PATIENT_REF, 'smart_scale'),
        source: expect.objectContaining({ kind: 'smart_scale' }),
      }),
    ]));
    expect(db.collection('alerts').documents).toHaveLength(0);
    adapter.stop();
  });

  test('runs only after a successful FHIR write and never calls an alert endpoint', async () => {
    const db = new FakeDb();
    const kafkaManager = { send: jest.fn().mockResolvedValue(undefined) };
    const adapter = createFhirObservationShadowAdapter({
      db,
      kafkaManager,
      logger: logger(),
      now: () => new Date(FIXED_NOW),
      resolveMonitoringPatientRef: jest.fn().mockResolvedValue(CANONICAL_PATIENT_REF),
    });
    const response = new EventEmitter();
    response.statusCode = 201;
    const next = jest.fn();

    adapter.middleware(
      {
        method: 'POST',
        originalUrl: '/4_0_0/Observation',
        body: heartRateObservation(),
      },
      response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(kafkaManager.send).not.toHaveBeenCalled();

    response.emit('finish');
    await waitFor(() => expect(kafkaManager.send).toHaveBeenCalledTimes(1));
    expect(db.collection('alerts').documents).toHaveLength(0);
    adapter.stop();
  });

  test('uses the HMAC provisioning service for the FHIR Patient Supabase identifier', async () => {
    const db = new FakeDb();
    db.collection(PATIENT_COLLECTION).documents.push({
      resourceType: 'Patient',
      id: 'demo-patient-001',
      identifier: [{ system: 'urn:saludata:supabase-users', value: SUPABASE_USER_ID }],
    });
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: jest.fn().mockReturnValue(null) },
      text: jest.fn().mockResolvedValue(JSON.stringify({
        actor_ref: `usr_${'c'.repeat(32)}`,
        patient_ref: CANONICAL_PATIENT_REF,
      })),
    });
    const env = {
      MONITORING_IDENTITY_HMAC_KEY: 'z'.repeat(32),
      MONITORING_PROVISION_URL: 'http://monitoring.example.invalid/internal/v1/patients/provision',
      MONITORING_PROVISION_TOKEN: 't'.repeat(32),
      MONITORING_PROVISIONING_CLINICIAN_ACTOR_REF: CLINICIAN_ACTOR_REF,
    };

    await expect(resolveCanonicalMonitoringPatientRef({
      db,
      patientReference: 'Patient/demo-patient-001',
      env,
      fetchImpl,
    })).resolves.toBe(CANONICAL_PATIENT_REF);

    expect(fetchImpl).toHaveBeenCalledWith(
      env.MONITORING_PROVISION_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${env.MONITORING_PROVISION_TOKEN}` }),
      }),
    );
    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(payload).toEqual(expect.objectContaining({
      clinician_actor_ref: CLINICIAN_ACTOR_REF,
      identity_key: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(JSON.stringify(payload)).not.toContain(SUPABASE_USER_ID);
    expect(db.collection('consent_state').documents).toHaveLength(0);
  });

  test('fails closed without an injected resolver or complete provisioning configuration', async () => {
    const db = new FakeDb();
    db.collection(PATIENT_COLLECTION).documents.push({
      resourceType: 'Patient',
      id: 'demo-patient-001',
      identifier: [{ system: 'urn:saludata:supabase-users', value: SUPABASE_USER_ID }],
    });
    const kafkaManager = { send: jest.fn().mockResolvedValue(undefined) };
    const adapter = createFhirObservationShadowAdapter({
      db,
      kafkaManager,
      logger: logger(),
      now: () => new Date(FIXED_NOW),
      env: {},
    });

    await expect(adapter.ingest(heartRateObservation())).rejects.toThrow(/provisioning is unavailable/i);
    expect(kafkaManager.send).not.toHaveBeenCalled();
    expect(db.collection('consent_state').documents).toHaveLength(0);
    adapter.stop();
  });
});
