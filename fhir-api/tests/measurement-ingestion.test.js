'use strict';

const {
  ensureMeasurementIngestionIndexes,
  ingestMeasurementBatch,
  measurementBatchHandler,
  monitoringConfig,
  publishOutboxEvent,
} = require('../src/routes/measurement-ingestion');
const {
  materializeEventBundle,
} = require('../src/monitoring/fhir-materializer');
const {
  DEVICE_REF,
  FIXED_NOW,
  PATIENT_REF,
  batch,
  ringEvent,
} = require('./fixtures/measurement-fixtures');

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function valueAt(document, path) {
  return path
    .split('.')
    .reduce(
      (value, key) => (value === null || value === undefined ? undefined : value[key]),
      document
    );
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

class FakeCursor {
  constructor(documents) {
    this.documents = documents;
  }

  sort(specification) {
    const [key, direction] = Object.entries(specification)[0];
    this.documents.sort((left, right) => {
      const a = valueAt(left, key);
      const b = valueAt(right, key);
      return a === b ? 0 : (a < b ? -1 : 1) * direction;
    });
    return this;
  }

  limit(count) {
    this.documents = this.documents.slice(0, count);
    return this;
  }

  async toArray() {
    return clone(this.documents);
  }
}

class FakeCollection {
  constructor() {
    this.documents = [];
    this.indexes = [];
    this.updateCalls = 0;
  }

  async createIndex(specification, options) {
    this.indexes.push({ specification, options });
    return options.name;
  }

  async findOne(filter) {
    return clone(this.documents.find(document => matches(document, filter)) || null);
  }

  find(filter) {
    return new FakeCursor(clone(this.documents.filter(document => matches(document, filter))));
  }

  async updateOne(filter, update, options = {}) {
    this.updateCalls++;
    const conflictingPaths = Object.keys(update.$setOnInsert || {}).filter(key =>
      Object.prototype.hasOwnProperty.call(update.$set || {}, key)
    );
    if (conflictingPaths.length > 0) {
      const error = new Error(`Conflicting update path: ${conflictingPaths[0]}`);
      error.code = 40;
      throw error;
    }
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
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function request(body, idempotencyKey = 'idem-key-00000001', authorization) {
  const headers = { 'idempotency-key': idempotencyKey };
  if (authorization) {
    headers.authorization = authorization;
  }
  return {
    body,
    headers,
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  };
}

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function dependencies(overrides = {}) {
  const db = overrides.db || new FakeDb();
  const kafkaManager = overrides.kafkaManager || {
    send: jest.fn().mockResolvedValue(undefined),
  };
  const deps = {
    db,
    kafkaManager,
    logger: overrides.logger || logger(),
    now: overrides.now || (() => new Date(FIXED_NOW)),
    authenticate: overrides.authenticate,
    materializeEventBundle: overrides.materializeEventBundle,
    setInterval: overrides.setInterval,
    clearInterval: overrides.clearInterval,
    config: Object.assign(
      {
        mode: 'synthetic',
        topic: 'saludata.measurements.pseud.v1',
        publishingEnabled: true,
      },
      overrides.config || {}
    ),
  };
  deps.ready = ensureMeasurementIngestionIndexes(db);
  return deps;
}

describe('POST /v1/measurement-batches ingestion service', () => {
  test('renews a slow Kafka publication lease across ingestion replicas', async () => {
    const db = new FakeDb();
    const outbox = db.collection('monitoring_measurement_outbox');
    let current = new Date(FIXED_NOW);
    const eventId = 'evt_00000000-0000-4000-8000-000000000001';
    outbox.documents.push({
      event_id: eventId,
      ready: true,
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date(FIXED_NOW),
      created_at: new Date(FIXED_NOW),
      topic: 'saludata.measurements.pseud.v1',
      message_key: PATIENT_REF,
      payload: {
        schema_version: 'saludata.measurement-event.v1',
        correlation_id: 'corr_00000000-0000-4000-8000-000000000001',
      },
    });

    let releaseSend;
    const slowSend = jest.fn(
      () => new Promise(resolve => {
        releaseSend = resolve;
      })
    );
    const renewalCallbacks = [];
    const replicaA = dependencies({
      db,
      now: () => new Date(current),
      kafkaManager: { send: slowSend },
      setInterval: callback => {
        renewalCallbacks.push(callback);
        return { unref: jest.fn() };
      },
      clearInterval: jest.fn(),
    });

    const firstPublish = publishOutboxEvent(replicaA, eventId);
    await new Promise(resolve => setImmediate(resolve));
    expect(slowSend).toHaveBeenCalledTimes(1);
    expect(renewalCallbacks).toHaveLength(1);

    current = new Date(new Date(FIXED_NOW).getTime() + 50 * 1000);
    await renewalCallbacks[0]();
    current = new Date(new Date(FIXED_NOW).getTime() + 70 * 1000);

    const secondSend = jest.fn().mockResolvedValue(undefined);
    const replicaB = dependencies({
      db,
      now: () => new Date(current),
      kafkaManager: { send: secondSend },
    });
    await publishOutboxEvent(replicaB, eventId);
    expect(secondSend).not.toHaveBeenCalled();

    releaseSend();
    await firstPublish;
    expect(slowSend).toHaveBeenCalledTimes(1);
    expect(outbox.documents[0]).toMatchObject({
      status: 'published',
      attempts: 1,
    });
  });

  test('defaults fail-closed and rejects invalid modes or topic names', () => {
    expect(monitoringConfig({})).toMatchObject({
      mode: 'disabled',
      topic: 'saludata.measurements.pseud.v1',
    });
    expect(() => monitoringConfig({ mode: 'production-open' })).toThrow(
      /must be disabled, synthetic, or authenticated/
    );
    expect(() => monitoringConfig({ topic: 'invalid topic' })).toThrow(/topic is invalid/i);
  });

  test('requires a constant-time service bearer in protected synthetic mode', async () => {
    expect(() =>
      monitoringConfig({
        mode: 'synthetic',
        syntheticAuthRequired: true,
        syntheticBearerToken: 'too-short',
      })
    ).toThrow('at least 32 non-whitespace characters');

    const serviceToken = 'synthetic-service-token-canary-000000000001';
    const deps = dependencies({
      config: {
        mode: 'synthetic',
        syntheticAuthRequired: true,
        syntheticBearerToken: serviceToken,
      },
    });

    await expect(
      ingestMeasurementBatch(request(batch(), 'idem-protected-synthetic-01'), deps)
    ).rejects.toMatchObject({ statusCode: 401, operationOutcomeCode: 'login' });
    await expect(
      ingestMeasurementBatch(
        request(batch(), 'idem-protected-synthetic-01', 'Bearer incorrect-canary-token'),
        deps
      )
    ).rejects.toMatchObject({ statusCode: 401, operationOutcomeCode: 'login' });

    const accepted = await ingestMeasurementBatch(
      request(batch(), 'idem-protected-synthetic-01', `Bearer ${serviceToken}`),
      deps
    );
    expect(accepted.status).toBe('accepted');
    expect(JSON.stringify(deps.logger.mock || deps.logger)).not.toContain(serviceToken);
  });

  test('materializes FHIR resources and publishes the pseudonymous event by patient key', async () => {
    const deps = dependencies();
    const ack = await ingestMeasurementBatch(request(batch()), deps);

    expect(ack).toMatchObject({
      schema_version: 'saludata.measurement-ingestion-ack.v1',
      status: 'accepted',
      mode: 'shadow',
      clinical_use: false,
    });
    expect(ack.events).toHaveLength(1);
    expect(ack.events[0].status).toBe('published');
    expect(ack.events[0].fhir.observation_ids).toHaveLength(4);

    expect(deps.kafkaManager.send).toHaveBeenCalledTimes(1);
    expect(deps.kafkaManager.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'saludata.measurements.pseud.v1',
        key: PATIENT_REF,
        message: expect.objectContaining({
          patient_ref: PATIENT_REF,
          device_ref: DEVICE_REF,
          synthetic: true,
          mode: 'shadow',
          clinical_use: false,
        }),
      })
    );

    expect(deps.db.collection('Observation_4_0_0').documents).toHaveLength(4);
    expect(deps.db.collection('Bundle_4_0_0').documents).toHaveLength(1);
    expect(deps.db.collection('monitoring_measurement_events').documents).toHaveLength(1);
    expect(deps.db.collection('monitoring_measurement_outbox').documents[0].status).toBe(
      'published'
    );
    const logOutput = [deps.logger.info, deps.logger.warn, deps.logger.error]
      .flatMap(method => method.mock.calls.flat())
      .join(' ');
    expect(logOutput).not.toContain(PATIENT_REF);
  });

  test('accepts a mixed-device batch and preserves event-level Kafka messages', async () => {
    const deps = dependencies();
    const scaleEvent = ringEvent({
      event_id: 'evt_scale_0000001',
      device_ref: `dev_${'c'.repeat(32)}`,
      source: {
        kind: 'smart_scale',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_SCALE',
      },
      measurements: [
        {
          code: 'body_weight',
          value: 74.2,
          unit: 'kg',
          quality: {
            status: 'good',
            score: 0.99,
            artifact_codes: [],
          },
        },
      ],
      symptoms: [],
    });
    delete scaleEvent.activity_context;
    const mixedBatch = {
      schema_version: 'saludata.measurement-batch.v1',
      batch_id: 'batch_mixed_00001',
      events: [ringEvent(), scaleEvent],
    };

    const ack = await ingestMeasurementBatch(request(mixedBatch, 'idem-mixed-000001'), deps);
    expect(ack.events).toHaveLength(2);
    expect(deps.kafkaManager.send).toHaveBeenCalledTimes(2);
    expect(deps.kafkaManager.send.mock.calls.map(call => call[0].message.event_id)).toEqual([
      'evt_ring_00000001',
      'evt_scale_0000001',
    ]);
    expect(deps.kafkaManager.send.mock.calls.every(call => call[0].key === PATIENT_REF)).toBe(
      true
    );
  });

  test('replays the same request idempotently without a second Kafka publication', async () => {
    const deps = dependencies();
    const first = await ingestMeasurementBatch(request(batch()), deps);
    const second = await ingestMeasurementBatch(request(batch()), deps);

    expect(first.events[0].duplicate).toBe(false);
    expect(second.events[0].duplicate).toBe(true);
    expect(deps.kafkaManager.send).toHaveBeenCalledTimes(1);
    expect(deps.db.collection('Observation_4_0_0').documents).toHaveLength(4);
    expect(deps.db.collection('monitoring_measurement_events').documents).toHaveLength(1);
    expect(deps.db.collection('monitoring_measurement_outbox').documents).toHaveLength(1);
  });

  test('materialization remains unique under concurrent identical requests', async () => {
    const deps = dependencies();
    const firstRequest = request(batch(), 'idem-concurrent-0001');
    const secondRequest = request(batch(), 'idem-concurrent-0001');

    const [first, second] = await Promise.all([
      ingestMeasurementBatch(firstRequest, deps),
      ingestMeasurementBatch(secondRequest, deps),
    ]);

    expect(first.events[0].fhir).toEqual(second.events[0].fhir);
    expect(deps.db.collection('Observation_4_0_0').documents).toHaveLength(4);
    expect(deps.db.collection('Observation_4_0_0_History').documents).toHaveLength(4);
    expect(deps.db.collection('Bundle_4_0_0').documents).toHaveLength(1);
    expect(deps.db.collection('Bundle_4_0_0_History').documents).toHaveLength(1);
    expect(deps.db.collection('monitoring_measurement_events').documents).toHaveLength(1);
    expect(deps.db.collection('monitoring_measurement_outbox').documents).toHaveLength(1);

    const fhirUpdateCalls = [
      'Observation_4_0_0',
      'Observation_4_0_0_History',
      'Bundle_4_0_0',
      'Bundle_4_0_0_History',
    ].reduce((count, name) => count + deps.db.collection(name).updateCalls, 0);
    expect(fhirUpdateCalls).toBe(10);
    expect(deps.db.collection('monitoring_measurement_events').documents[0]).toMatchObject({
      status: 'materialized',
      fhir: first.events[0].fhir,
    });
    expect(
      deps.db.collection('monitoring_measurement_events').documents[0]
        .materialization_lease_id
    ).toBeUndefined();
  });

  test('renews a long-running materialization lease before writing FHIR', async () => {
    let currentTime = new Date(FIXED_NOW);
    let intervalCallback;
    let releaseMaterialization;
    const materializationGate = new Promise(resolve => {
      releaseMaterialization = resolve;
    });
    const deferredMaterializer = jest.fn(async (db, event) => {
      await materializationGate;
      return materializeEventBundle(db, event);
    });
    const clearInterval = jest.fn();
    const deps = dependencies({
      now: () => new Date(currentTime),
      materializeEventBundle: deferredMaterializer,
      setInterval: jest.fn(callback => {
        intervalCallback = callback;
        return { unref: jest.fn() };
      }),
      clearInterval,
    });

    const pending = ingestMeasurementBatch(
      request(batch(), 'idem-long-materialization-01'),
      deps
    );
    while (deferredMaterializer.mock.calls.length === 0) {
      await Promise.resolve();
    }
    const eventCollection = deps.db.collection('monitoring_measurement_events');
    const initialExpiry = eventCollection.documents[0].materialization_lease_expires_at;

    currentTime = new Date(currentTime.getTime() + 40 * 1000);
    intervalCallback();
    await new Promise(resolve => setImmediate(resolve));
    expect(eventCollection.documents[0].materialization_lease_expires_at.getTime()).toBe(
      currentTime.getTime() + 60 * 1000
    );
    expect(
      eventCollection.documents[0].materialization_lease_expires_at.getTime()
    ).toBeGreaterThan(initialExpiry.getTime());

    releaseMaterialization();
    const ack = await pending;
    expect(ack.status).toBe('accepted');
    // One renewal guards FHIR materialization and one guards the subsequent
    // Kafka outbox publication.
    expect(clearInterval).toHaveBeenCalledTimes(2);
    expect(
      deps.db
        .collection('Observation_4_0_0')
        .documents.every(document => String(document._id).startsWith('fhir-'))
    ).toBe(true);
  });

  test('reconciles a crash after materialization commit but before outbox readiness', async () => {
    const materializer = jest.fn(materializeEventBundle);
    const deps = dependencies({ materializeEventBundle: materializer });
    const outbox = deps.db.collection('monitoring_measurement_outbox');
    const updateOutbox = outbox.updateOne.bind(outbox);
    let failReadyPromotion = true;
    outbox.updateOne = jest.fn(async (filter, update, options) => {
      if (failReadyPromotion && update.$set && update.$set.ready === true) {
        failReadyPromotion = false;
        throw new Error('synthetic crash before outbox readiness');
      }
      return updateOutbox(filter, update, options);
    });

    await expect(
      ingestMeasurementBatch(
        request(batch(), 'idem-crash-reconcile-0001'),
        deps
      )
    ).rejects.toMatchObject({ statusCode: 503, operationOutcomeCode: 'transient' });

    expect(deps.kafkaManager.send).not.toHaveBeenCalled();
    expect(materializer).toHaveBeenCalledTimes(1);
    expect(deps.db.collection('monitoring_measurement_events').documents[0].status).toBe(
      'materialized'
    );
    expect(outbox.documents[0]).toMatchObject({ ready: false, status: 'pending' });

    const replay = await ingestMeasurementBatch(
      request(batch(), 'idem-crash-reconcile-0001'),
      deps
    );
    expect(replay.events[0].status).toBe('published');
    expect(materializer).toHaveBeenCalledTimes(1);
    expect(deps.kafkaManager.send).toHaveBeenCalledTimes(1);
    expect(outbox.documents[0]).toMatchObject({ ready: true, status: 'published' });
    expect(deps.db.collection('Observation_4_0_0').documents).toHaveLength(4);
    expect(deps.db.collection('Observation_4_0_0_History').documents).toHaveLength(4);
  });

  test('rejects Idempotency-Key reuse with a different payload', async () => {
    const deps = dependencies();
    await ingestMeasurementBatch(request(batch()), deps);
    const changedEvent = ringEvent({ produced_at: '2026-08-12T07:30:04Z' });

    await expect(
      ingestMeasurementBatch(request(batch(changedEvent)), deps)
    ).rejects.toMatchObject({ statusCode: 409, operationOutcomeCode: 'duplicate' });
    expect(deps.kafkaManager.send).toHaveBeenCalledTimes(1);
  });

  test('rejects event_id collision under a new request key', async () => {
    const deps = dependencies();
    await ingestMeasurementBatch(request(batch()), deps);
    const changedEvent = ringEvent({ produced_at: '2026-08-12T07:30:04Z' });

    await expect(
      ingestMeasurementBatch(request(batch(changedEvent), 'idem-key-00000002'), deps)
    ).rejects.toMatchObject({ statusCode: 409, operationOutcomeCode: 'duplicate' });
  });

  test('is fail-closed when ingestion mode is not explicitly enabled', async () => {
    const deps = dependencies({ config: { mode: 'disabled' } });
    await expect(ingestMeasurementBatch(request(batch()), deps)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(deps.db.collection('monitoring_measurement_events').documents).toHaveLength(0);
  });

  test('requires authorization for each opaque patient ref in authenticated mode', async () => {
    const missingBearer = dependencies({ config: { mode: 'authenticated' } });
    await expect(ingestMeasurementBatch(request(batch()), missingBearer)).rejects.toMatchObject({
      statusCode: 401,
      operationOutcomeCode: 'login',
    });

    const authenticate = jest.fn().mockResolvedValue({ authenticated: true });
    const deps = dependencies({ config: { mode: 'authenticated' }, authenticate });
    await ingestMeasurementBatch(request(batch(), 'idem-key-00000003', 'Bearer test-token'), deps);
    expect(authenticate).toHaveBeenCalledWith(expect.any(Object), [PATIENT_REF]);

    const denied = dependencies({
      config: { mode: 'authenticated' },
      authenticate: jest.fn().mockRejectedValue(
        Object.assign(new Error('Forbidden'), {
          statusCode: 403,
          operationOutcomeCode: 'forbidden',
        })
      ),
    });
    await expect(
      ingestMeasurementBatch(request(batch(), 'idem-key-00000004', 'Bearer test-token'), denied)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('keeps a failed publication in the outbox without leaking data to logs', async () => {
    const safeLogger = logger();
    const kafkaManager = { send: jest.fn().mockRejectedValue(new Error('broker details secret')) };
    const deps = dependencies({ logger: safeLogger, kafkaManager });
    const ack = await ingestMeasurementBatch(request(batch()), deps);

    expect(ack.events[0].status).toBe('queued');
    expect(deps.db.collection('monitoring_measurement_outbox').documents[0]).toMatchObject({
      status: 'retry',
      last_error_code: 'KAFKA_PUBLISH_FAILED',
    });
    const logOutput = safeLogger.warn.mock.calls.flat().join(' ');
    expect(logOutput).not.toContain(PATIENT_REF);
    expect(logOutput).not.toContain('broker details secret');
  });

  test('returns a FHIR OperationOutcome for a contract error', async () => {
    const deps = dependencies();
    const res = response();
    const invalid = batch();
    invalid.events[0].patient_id = 'direct-identifier';
    await measurementBatchHandler(deps)(request(invalid), res);

    expect(res.statusCode).toBe(422);
    expect(res.body.resourceType).toBe('OperationOutcome');
    expect(res.body.issue[0]).toMatchObject({ code: 'security', severity: 'error' });
  });

  test('does not persist, publish, or log a consumer-incompatible device payload', async () => {
    const safeLogger = logger();
    const deps = dependencies({ logger: safeLogger });
    const res = response();
    const poisonEvent = ringEvent({
      event_id: 'evt_poison_canary_01',
      source: {
        kind: 'blood_pressure_monitor',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_BP',
      },
      measurements: [
        {
          code: 'systolic_blood_pressure',
          value: 145,
          unit: 'mm[Hg]',
          quality: {
            status: 'good',
            score: 0.98,
            artifact_codes: [],
          },
        },
      ],
    });

    await measurementBatchHandler(deps)(
      request(batch(poisonEvent), 'idem-poison-canary-01'),
      res
    );

    expect(res.statusCode).toBe(422);
    expect(res.body.issue[0]).toMatchObject({ code: 'required' });
    expect(deps.kafkaManager.send).not.toHaveBeenCalled();
    expect(deps.db.collection('monitoring_ingestion_requests').documents).toHaveLength(0);
    expect(deps.db.collection('monitoring_measurement_events').documents).toHaveLength(0);
    expect(deps.db.collection('Observation_4_0_0').documents).toHaveLength(0);
    const logOutput = [safeLogger.info, safeLogger.warn, safeLogger.error]
      .flatMap(method => method.mock.calls.flat())
      .join(' ');
    expect(logOutput).not.toContain(poisonEvent.event_id);
    expect(logOutput).not.toContain(poisonEvent.patient_ref);
    expect(logOutput).not.toContain(poisonEvent.device_ref);
    expect(logOutput).not.toContain('145');
  });
});
