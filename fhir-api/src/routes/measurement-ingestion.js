'use strict';

const crypto = require('crypto');
const {
  ACK_SCHEMA_VERSION,
  ContractValidationError,
  payloadFingerprint,
  sha256,
  validateMeasurementBatch,
} = require('../monitoring/measurement-contract');
const { materializeEventBundle } = require('../monitoring/fhir-materializer');

const DEFAULT_TOPIC = 'saludata.measurements.pseud.v1';
const REQUESTS_COLLECTION = 'monitoring_ingestion_requests';
const EVENTS_COLLECTION = 'monitoring_measurement_events';
const OUTBOX_COLLECTION = 'monitoring_measurement_outbox';
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const OUTBOX_LEASE_MS = 60 * 1000;
const OUTBOX_LEASE_RENEWAL_MS = 20 * 1000;
const MATERIALIZATION_LEASE_MS = 60 * 1000;
const MATERIALIZATION_LEASE_RENEWAL_MS = 20 * 1000;
const MATERIALIZATION_WAIT_ATTEMPTS = 100;
const MATERIALIZATION_WAIT_MS = 10;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
const MAX_TOPIC_LENGTH = 249;

let supabaseClient = null;

class IngestionError extends Error {
  constructor(statusCode, operationOutcomeCode, message, expression) {
    super(message);
    this.name = 'IngestionError';
    this.statusCode = statusCode;
    this.operationOutcomeCode = operationOutcomeCode;
    this.expression = expression ? [expression] : undefined;
  }
}

class MaterializationLeaseLostError extends Error {
  constructor() {
    super('Event materialization lease was lost.');
    this.name = 'MaterializationLeaseLostError';
  }
}

function collection(db, name) {
  return db.collection(name);
}

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.name === 'MongoServerError' && error.code === 11000));
}

function nowDate(deps) {
  return typeof deps.now === 'function' ? deps.now() : new Date();
}

function operationOutcome(error) {
  const statusCode = error.statusCode || 500;
  const issue = {
    severity: statusCode >= 500 ? 'fatal' : 'error',
    code: error.operationOutcomeCode || 'exception',
    details: {
      text: statusCode >= 500 ? 'The ingestion request could not be completed.' : error.message,
    },
  };
  if (error.expression) {
    issue.expression = error.expression;
  }
  return {
    resourceType: 'OperationOutcome',
    issue: [issue],
  };
}

function idempotencyKeyFromRequest(req) {
  const value = req.get ? req.get('Idempotency-Key') : req.headers['idempotency-key'];
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY.test(value)) {
    throw new IngestionError(
      400,
      'required',
      'A valid Idempotency-Key header is required.',
      'header.Idempotency-Key'
    );
  }
  return value;
}

function bearerToken(req) {
  const value = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const match = String(value).match(/^Bearer\s+([^\s]+)$/i);
  return match ? match[1] : null;
}

function secureTokenEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }
  const leftDigest = crypto.createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = crypto.createHash('sha256').update(right, 'utf8').digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function configuredSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new IngestionError(
      503,
      'transient',
      'Authentication service is not configured.'
    );
  }
  // The dedicated synthetic/shadow runtime never loads this optional client.
  // Lazy loading keeps its large browser/realtime dependency tree out of the
  // Step-1 image while preserving the legacy authenticated mode.
  const { createClient } = require('@supabase/supabase-js');
  supabaseClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseClient;
}

async function authenticateWithSupabase(req, patientRefs) {
  const token = bearerToken(req);
  if (!token) {
    throw new IngestionError(401, 'login', 'Bearer authentication is required.');
  }
  const client = configuredSupabaseClient();
  const result = await client.auth.getUser(token);
  if (result.error || !result.data || !result.data.user) {
    throw new IngestionError(401, 'login', 'Bearer token is invalid or expired.');
  }

  // Authorization data must come from app_metadata. user_metadata is user-editable.
  const appMetadata = result.data.user.app_metadata || {};
  const authorizedRefs = Array.isArray(appMetadata.monitoring_patient_refs)
    ? appMetadata.monitoring_patient_refs
    : [];
  const ingestionEnabled = appMetadata.monitoring_ingestion_enabled === true;
  if (!ingestionEnabled || patientRefs.some(ref => !authorizedRefs.includes(ref))) {
    throw new IngestionError(403, 'forbidden', 'The caller is not authorized for this patient.');
  }
  return { authenticated: true };
}

async function authorizeRequest(req, batch, deps) {
  const mode = deps.config.mode;
  if (mode === 'synthetic') {
    if (deps.config.syntheticAuthRequired) {
      const token = bearerToken(req);
      if (!secureTokenEqual(token, deps.config.syntheticBearerToken)) {
        throw new IngestionError(401, 'login', 'Bearer authentication is required.');
      }
    }
    const safe = batch.events.every(
      event => event.synthetic === true && event.mode === 'shadow' && event.clinical_use === false
    );
    if (!safe) {
      throw new IngestionError(403, 'security', 'Synthetic mode accepts shadow test data only.');
    }
    return { authenticated: false, syntheticBypass: true };
  }
  if (mode !== 'authenticated') {
    throw new IngestionError(503, 'transient', 'Monitoring ingestion is disabled.');
  }
  const patientRefs = Array.from(new Set(batch.events.map(event => event.patient_ref)));
  const authenticate = deps.authenticate || authenticateWithSupabase;
  try {
    return await authenticate(req, patientRefs);
  } catch (error) {
    if (error instanceof IngestionError) {
      throw error;
    }
    if (error && (error.statusCode === 401 || error.statusCode === 403)) {
      throw new IngestionError(
        error.statusCode,
        error.statusCode === 401 ? 'login' : 'forbidden',
        error.statusCode === 401
          ? 'Bearer authentication failed.'
          : 'The caller is not authorized for this patient.'
      );
    }
    throw new IngestionError(503, 'transient', 'Authentication service is unavailable.');
  }
}

async function ensureMeasurementIngestionIndexes(db) {
  await Promise.all([
    collection(db, REQUESTS_COLLECTION).createIndex(
      { batch_id: 1 },
      { name: 'monitoring_ingestion_batch' }
    ),
    collection(db, EVENTS_COLLECTION).createIndex(
      { event_id: 1 },
      { unique: true, name: 'monitoring_event_identity' }
    ),
    collection(db, EVENTS_COLLECTION).createIndex(
      { patient_ref: 1, occurred_at: -1 },
      { name: 'monitoring_event_patient_time' }
    ),
    collection(db, OUTBOX_COLLECTION).createIndex(
      { event_id: 1 },
      { unique: true, name: 'monitoring_outbox_event_identity' }
    ),
    collection(db, OUTBOX_COLLECTION).createIndex(
      { ready: 1, status: 1, next_attempt_at: 1 },
      { name: 'monitoring_outbox_delivery' }
    ),
  ]);
}

async function assertNoStoredCollisions(deps, requestId, batchFingerprint, batch) {
  const existingRequest = await collection(deps.db, REQUESTS_COLLECTION).findOne({ _id: requestId });
  if (existingRequest && existingRequest.payload_fingerprint !== batchFingerprint) {
    throw new IngestionError(
      409,
      'duplicate',
      'Idempotency-Key has already been used with a different payload.',
      'header.Idempotency-Key'
    );
  }

  const existingEvents = new Map();
  for (const event of batch.events) {
    const existing = await collection(deps.db, EVENTS_COLLECTION).findOne({ event_id: event.event_id });
    if (existing) {
      const fingerprint = payloadFingerprint(event);
      if (existing.payload_fingerprint !== fingerprint) {
        throw new IngestionError(
          409,
          'duplicate',
          'event_id has already been used with a different payload.',
          'body.events.event_id'
        );
      }
      existingEvents.set(event.event_id, existing);
    }
  }
  return { existingRequest, existingEvents };
}

async function persistRequest(deps, requestId, batchFingerprint, batch, receivedAt) {
  try {
    await collection(deps.db, REQUESTS_COLLECTION).updateOne(
      { _id: requestId, payload_fingerprint: batchFingerprint },
      {
        $setOnInsert: {
          _id: requestId,
          batch_id: batch.batch_id,
          payload_fingerprint: batchFingerprint,
          event_ids: batch.events.map(event => event.event_id),
          created_at: receivedAt,
        },
        $set: {
          status: 'processing',
          updated_at: receivedAt,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }
  const stored = await collection(deps.db, REQUESTS_COLLECTION).findOne({ _id: requestId });
  if (!stored || stored.payload_fingerprint !== batchFingerprint) {
    throw new IngestionError(
      409,
      'duplicate',
      'Idempotency-Key has already been used with a different payload.',
      'header.Idempotency-Key'
    );
  }
}

function waitForMaterialization(deps) {
  if (typeof deps.sleep === 'function') {
    return deps.sleep(MATERIALIZATION_WAIT_MS);
  }
  return new Promise(resolve => setTimeout(resolve, MATERIALIZATION_WAIT_MS));
}

async function claimEventMaterialization(deps, eventId, fingerprint) {
  const now = nowDate(deps);
  const leaseId = crypto.randomUUID();
  const claimed = await collection(deps.db, EVENTS_COLLECTION).findOneAndUpdate(
    {
      event_id: eventId,
      payload_fingerprint: fingerprint,
      $or: [
        { status: 'pending_materialization' },
        {
          status: 'materialization_retry',
          next_materialization_attempt_at: { $lte: now },
        },
        {
          status: 'materializing',
          materialization_lease_expires_at: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: 'materializing',
        materialization_lease_id: leaseId,
        materialization_lease_expires_at: new Date(
          now.getTime() + MATERIALIZATION_LEASE_MS
        ),
        updated_at: now,
      },
    },
    { returnDocument: 'after' }
  );
  return claimed ? { leaseId } : null;
}

function startMaterializationLeaseRenewal(deps, eventId, leaseId) {
  const schedule = deps.setInterval || setInterval;
  const cancel = deps.clearInterval || clearInterval;
  let lost = false;
  let stopped = false;
  let pending = Promise.resolve();

  const renew = async () => {
    if (stopped || lost) {
      return;
    }
    const now = nowDate(deps);
    const result = await collection(deps.db, EVENTS_COLLECTION).updateOne(
      {
        event_id: eventId,
        status: 'materializing',
        materialization_lease_id: leaseId,
      },
      {
        $set: {
          materialization_lease_expires_at: new Date(
            now.getTime() + MATERIALIZATION_LEASE_MS
          ),
          updated_at: now,
        },
      }
    );
    if (result.matchedCount !== 1) {
      lost = true;
    }
  };
  const enqueueRenewal = () => {
    pending = pending.then(renew).catch(() => {
      lost = true;
    });
    return pending;
  };
  const timer = schedule(enqueueRenewal, MATERIALIZATION_LEASE_RENEWAL_MS);
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }

  return {
    renewNow: enqueueRenewal,
    isLost: () => lost,
    stop: async () => {
      if (!stopped) {
        stopped = true;
        cancel(timer);
      }
      await pending;
    },
  };
}

async function ensureEventOutbox(deps, event, fingerprint, receivedAt, ready) {
  const outboxUpdate = {
    $setOnInsert: {
      event_id: event.event_id,
      topic: deps.config.topic,
      message_key: event.patient_ref,
      payload: event,
      payload_fingerprint: fingerprint,
      status: 'pending',
      attempts: 0,
      ready: false,
      created_at: receivedAt,
      next_attempt_at: receivedAt,
    },
    $set: {
      updated_at: receivedAt,
    },
  };
  if (ready) {
    delete outboxUpdate.$setOnInsert.ready;
    outboxUpdate.$set.ready = true;
  }
  try {
    await collection(deps.db, OUTBOX_COLLECTION).updateOne(
      { event_id: event.event_id },
      outboxUpdate,
      { upsert: true }
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    await collection(deps.db, OUTBOX_COLLECTION).updateOne(
      { event_id: event.event_id, payload_fingerprint: fingerprint },
      outboxUpdate
    );
  }
  const stored = await collection(deps.db, OUTBOX_COLLECTION).findOne({
    event_id: event.event_id,
  });
  if (!stored || stored.payload_fingerprint !== fingerprint) {
    throw new IngestionError(
      409,
      'duplicate',
      'event_id has already been used with a different outbox payload.',
      'body.events.event_id'
    );
  }
}

async function materializeClaimedEvent(deps, event, fingerprint, receivedAt, leaseId) {
  const renewal = startMaterializationLeaseRenewal(
    deps,
    event.event_id,
    leaseId
  );
  try {
    const materialize = deps.materializeEventBundle || materializeEventBundle;
    const fhir = await materialize(deps.db, event);
    await renewal.renewNow();
    if (renewal.isLost()) {
      throw new MaterializationLeaseLostError();
    }
    await ensureEventOutbox(deps, event, fingerprint, receivedAt, false);
    await renewal.stop();
    if (renewal.isLost()) {
      throw new MaterializationLeaseLostError();
    }
    const completion = await collection(deps.db, EVENTS_COLLECTION).updateOne(
      { event_id: event.event_id, materialization_lease_id: leaseId },
      {
        $set: {
          status: 'materialized',
          fhir,
          updated_at: nowDate(deps),
        },
        $unset: {
          materialization_lease_id: '',
          materialization_lease_expires_at: '',
          next_materialization_attempt_at: '',
          last_materialization_error_code: '',
        },
      }
    );
    if (completion.matchedCount !== 1) {
      throw new MaterializationLeaseLostError();
    }
    await ensureEventOutbox(deps, event, fingerprint, receivedAt, true);
    return fhir;
  } catch (error) {
    await renewal.stop();
    if (error instanceof MaterializationLeaseLostError) {
      throw error;
    }
    await collection(deps.db, EVENTS_COLLECTION).updateOne(
      { event_id: event.event_id, materialization_lease_id: leaseId },
      {
        $set: {
          status: 'materialization_retry',
          next_materialization_attempt_at: nowDate(deps),
          last_materialization_error_code: 'FHIR_MATERIALIZATION_FAILED',
          updated_at: nowDate(deps),
        },
        $unset: {
          materialization_lease_id: '',
          materialization_lease_expires_at: '',
        },
      }
    );
    throw error;
  }
}

async function obtainEventMaterialization(deps, event, fingerprint, receivedAt) {
  for (let attempt = 0; attempt < MATERIALIZATION_WAIT_ATTEMPTS; attempt++) {
    const stored = await collection(deps.db, EVENTS_COLLECTION).findOne({
      event_id: event.event_id,
    });
    if (stored && stored.status === 'materialized') {
      if (!stored.fhir) {
        throw new Error('Materialized event is missing its FHIR result.');
      }
      await ensureEventOutbox(deps, event, fingerprint, receivedAt, true);
      return stored.fhir;
    }

    const claim = await claimEventMaterialization(deps, event.event_id, fingerprint);
    if (claim) {
      try {
        return await materializeClaimedEvent(
          deps,
          event,
          fingerprint,
          receivedAt,
          claim.leaseId
        );
      } catch (error) {
        if (!(error instanceof MaterializationLeaseLostError)) {
          throw error;
        }
      }
    }
    await waitForMaterialization(deps);
  }
  throw new Error('Timed out waiting for event materialization.');
}

async function persistEvent(deps, event, duplicate, receivedAt) {
  const fingerprint = payloadFingerprint(event);
  let writeResult = { upsertedCount: 0 };
  try {
    writeResult = await collection(deps.db, EVENTS_COLLECTION).updateOne(
      { event_id: event.event_id, payload_fingerprint: fingerprint },
      {
        $setOnInsert: {
          event_id: event.event_id,
          patient_ref: event.patient_ref,
          device_ref: event.device_ref,
          occurred_at: new Date(event.occurred_at),
          produced_at: new Date(event.produced_at),
          payload: event,
          payload_fingerprint: fingerprint,
          received_at: receivedAt,
          status: 'pending_materialization',
          next_materialization_attempt_at: receivedAt,
        },
        $set: {
          updated_at: receivedAt,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }
  const stored = await collection(deps.db, EVENTS_COLLECTION).findOne({ event_id: event.event_id });
  if (!stored || stored.payload_fingerprint !== fingerprint) {
    throw new IngestionError(
      409,
      'duplicate',
      'event_id has already been used with a different payload.',
      'body.events.event_id'
    );
  }

  const fhir = await obtainEventMaterialization(deps, event, fingerprint, receivedAt);
  return {
    event_id: event.event_id,
    duplicate: duplicate || writeResult.upsertedCount === 0,
    fhir,
  };
}

function outboxBackoff(attempts) {
  return Math.min(MAX_RETRY_DELAY_MS, Math.pow(2, Math.max(0, attempts - 1)) * 1000);
}

async function claimOutboxEvent(deps, eventId) {
  const now = nowDate(deps);
  const leaseId = crypto.randomUUID();
  const claimed = await collection(deps.db, OUTBOX_COLLECTION).findOneAndUpdate(
    {
      event_id: eventId,
      ready: true,
      $or: [
        {
          status: { $in: ['pending', 'retry'] },
          next_attempt_at: { $lte: now },
        },
        {
          status: 'publishing',
          lease_expires_at: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: 'publishing',
        lease_id: leaseId,
        lease_expires_at: new Date(now.getTime() + OUTBOX_LEASE_MS),
        updated_at: now,
      },
      $inc: { attempts: 1 },
    },
    { returnDocument: 'after' }
  );
  return claimed ? { claimed, leaseId } : null;
}

function startOutboxLeaseRenewal(deps, eventId, leaseId) {
  const schedule = deps.setInterval || setInterval;
  const cancel = deps.clearInterval || clearInterval;
  let lost = false;
  let stopped = false;
  let pending = Promise.resolve();

  const renew = async () => {
    if (stopped || lost) {
      return;
    }
    const now = nowDate(deps);
    const result = await collection(deps.db, OUTBOX_COLLECTION).updateOne(
      {
        event_id: eventId,
        status: 'publishing',
        lease_id: leaseId,
      },
      {
        $set: {
          lease_expires_at: new Date(now.getTime() + OUTBOX_LEASE_MS),
          updated_at: now,
        },
      }
    );
    if (result.matchedCount !== 1) {
      lost = true;
    }
  };
  const enqueueRenewal = () => {
    pending = pending.then(renew).catch(() => {
      lost = true;
    });
    return pending;
  };
  const timer = schedule(enqueueRenewal, OUTBOX_LEASE_RENEWAL_MS);
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }

  return {
    renewNow: enqueueRenewal,
    isLost: () => lost,
    stop: async () => {
      if (!stopped) {
        stopped = true;
        cancel(timer);
      }
      await pending;
    },
  };
}

async function publishOutboxEvent(deps, eventId) {
  if (!deps.config.publishingEnabled || !deps.kafkaManager) {
    return collection(deps.db, OUTBOX_COLLECTION).findOne({ event_id: eventId });
  }
  const lease = await claimOutboxEvent(deps, eventId);
  if (!lease) {
    return collection(deps.db, OUTBOX_COLLECTION).findOne({ event_id: eventId });
  }

  const document = lease.claimed;
  const renewal = startOutboxLeaseRenewal(deps, eventId, lease.leaseId);
  try {
    await renewal.renewNow();
    if (renewal.isLost()) {
      await renewal.stop();
      return collection(deps.db, OUTBOX_COLLECTION).findOne({ event_id: eventId });
    }
    await deps.kafkaManager.send({
      topic: document.topic,
      key: document.message_key,
      message: document.payload,
      headers: {
        schema_version: document.payload.schema_version,
        event_id: document.event_id,
        correlation_id: document.payload.correlation_id,
        content_type: 'application/json',
      },
    });
    await renewal.renewNow();
    await renewal.stop();
    if (renewal.isLost()) {
      deps.logger.warn(
        `[MonitoringIngestion] Kafka publish ownership lost event_ref=${sha256(eventId).slice(0, 12)} code=OUTBOX_LEASE_LOST`
      );
      return collection(deps.db, OUTBOX_COLLECTION).findOne({ event_id: eventId });
    }
    const publishedAt = nowDate(deps);
    const completed = await collection(deps.db, OUTBOX_COLLECTION).updateOne(
      { event_id: eventId, lease_id: lease.leaseId },
      {
        $set: {
          status: 'published',
          published_at: publishedAt,
          updated_at: publishedAt,
        },
        $unset: { lease_id: '', lease_expires_at: '', last_error_code: '' },
      }
    );
    if (completed.matchedCount !== 1) {
      deps.logger.warn(
        `[MonitoringIngestion] Kafka publish ownership lost event_ref=${sha256(eventId).slice(0, 12)} code=OUTBOX_LEASE_LOST`
      );
    }
  } catch (error) {
    void error;
    await renewal.stop();
    const failedAt = nowDate(deps);
    const retryAt = new Date(failedAt.getTime() + outboxBackoff(document.attempts));
    await collection(deps.db, OUTBOX_COLLECTION).updateOne(
      { event_id: eventId, lease_id: lease.leaseId },
      {
        $set: {
          status: 'retry',
          last_error_code: 'KAFKA_PUBLISH_FAILED',
          next_attempt_at: retryAt,
          updated_at: failedAt,
        },
        $unset: { lease_id: '', lease_expires_at: '' },
      }
    );
    deps.logger.warn(
      `[MonitoringIngestion] Kafka publish deferred event_ref=${sha256(eventId).slice(0, 12)} code=KAFKA_PUBLISH_FAILED`
    );
  }
  return collection(deps.db, OUTBOX_COLLECTION).findOne({ event_id: eventId });
}

async function flushMeasurementOutbox(deps, limit = 50) {
  await deps.ready;
  if (!deps.config.publishingEnabled || !deps.kafkaManager) {
    return { attempted: 0 };
  }
  const now = nowDate(deps);
  const pending = await collection(deps.db, OUTBOX_COLLECTION)
    .find({
      ready: true,
      $or: [
        { status: { $in: ['pending', 'retry'] }, next_attempt_at: { $lte: now } },
        { status: 'publishing', lease_expires_at: { $lte: now } },
      ],
    })
    .sort({ created_at: 1 })
    .limit(limit)
    .toArray();
  for (const document of pending) {
    await publishOutboxEvent(deps, document.event_id);
  }
  return { attempted: pending.length };
}

function ackStatus(outbox) {
  if (!outbox) {
    return 'stored';
  }
  return outbox.status === 'published' ? 'published' : 'queued';
}

async function ingestMeasurementBatch(req, deps) {
  await deps.ready;
  const idempotencyKey = idempotencyKeyFromRequest(req);
  const batch = validateMeasurementBatch(req.body, { now: nowDate(deps) });
  await authorizeRequest(req, batch, deps);

  const requestId = `req_${sha256(idempotencyKey)}`;
  const batchFingerprint = payloadFingerprint(batch);
  const existing = await assertNoStoredCollisions(deps, requestId, batchFingerprint, batch);
  const receivedAt = nowDate(deps);
  await persistRequest(deps, requestId, batchFingerprint, batch, receivedAt);

  const persisted = [];
  try {
    for (const event of batch.events) {
      persisted.push(
        await persistEvent(deps, event, existing.existingEvents.has(event.event_id), receivedAt)
      );
    }
  } catch (error) {
    await collection(deps.db, REQUESTS_COLLECTION).updateOne(
      { _id: requestId },
      {
        $set: {
          status:
            error instanceof IngestionError && error.statusCode === 409 ? 'rejected' : 'retry',
          last_error_code:
            error instanceof IngestionError && error.statusCode === 409
              ? 'IDENTITY_COLLISION'
              : 'MATERIALIZATION_FAILED',
          updated_at: nowDate(deps),
        },
      }
    );
    if (error instanceof IngestionError) {
      throw error;
    }
    throw new IngestionError(503, 'transient', 'Measurement materialization failed.');
  }

  const eventResults = [];
  for (const result of persisted) {
    const outbox = await publishOutboxEvent(deps, result.event_id);
    eventResults.push({
      event_id: result.event_id,
      status: ackStatus(outbox),
      duplicate: result.duplicate,
      fhir: result.fhir,
    });
  }
  await collection(deps.db, REQUESTS_COLLECTION).updateOne(
    { _id: requestId },
    {
      $set: {
        status: 'accepted',
        results: eventResults,
        updated_at: nowDate(deps),
      },
      $unset: { last_error_code: '' },
    }
  );

  deps.logger.info(
    `[MonitoringIngestion] batch accepted request_ref=${requestId.slice(0, 20)} events=${eventResults.length} duplicates=${eventResults.filter(item => item.duplicate).length}`
  );
  return {
    schema_version: ACK_SCHEMA_VERSION,
    request_ref: requestId,
    batch_id: batch.batch_id,
    status: 'accepted',
    mode: 'shadow',
    clinical_use: false,
    events: eventResults,
  };
}

function measurementBatchHandler(deps) {
  return async function (req, res) {
    try {
      const ack = await ingestMeasurementBatch(req, deps);
      return res.status(202).json(ack);
    } catch (error) {
      const safeError =
        error instanceof ContractValidationError || error instanceof IngestionError
          ? error
          : new IngestionError(500, 'exception', 'Unexpected ingestion failure.');
      deps.logger.warn(
        `[MonitoringIngestion] request rejected status=${safeError.statusCode || 500} code=${safeError.operationOutcomeCode || 'exception'}`
      );
      return res.status(safeError.statusCode || 500).json(operationOutcome(safeError));
    }
  };
}

function monitoringConfig(options) {
  const mode = options.mode || process.env.MONITORING_INGESTION_MODE || 'disabled';
  const topic = options.topic || process.env.MONITORING_MEASUREMENTS_TOPIC || DEFAULT_TOPIC;
  if (!['disabled', 'synthetic', 'authenticated'].includes(mode)) {
    throw new Error('MONITORING_INGESTION_MODE must be disabled, synthetic, or authenticated.');
  }
  if (
    typeof topic !== 'string' ||
    topic.length < 1 ||
    topic.length > MAX_TOPIC_LENGTH ||
    !/^[A-Za-z0-9._-]+$/.test(topic) ||
    topic === '.' ||
    topic === '..'
  ) {
    throw new Error('MONITORING_MEASUREMENTS_TOPIC is invalid.');
  }
  const syntheticAuthRequired =
    options.syntheticAuthRequired !== undefined
      ? options.syntheticAuthRequired
      : process.env.MONITORING_SYNTHETIC_AUTH_REQUIRED === 'true';
  const syntheticBearerToken =
    options.syntheticBearerToken || process.env.MONITORING_SYNTHETIC_BEARER_TOKEN;
  if (
    syntheticAuthRequired &&
    (typeof syntheticBearerToken !== 'string' ||
      syntheticBearerToken.length < 32 ||
      /\s/.test(syntheticBearerToken))
  ) {
    throw new Error(
      'MONITORING_SYNTHETIC_BEARER_TOKEN must contain at least 32 non-whitespace characters when synthetic authentication is required.'
    );
  }
  return {
    mode,
    topic,
    syntheticAuthRequired,
    syntheticBearerToken,
    publishingEnabled:
      options.publishingEnabled !== undefined
        ? options.publishingEnabled
        : process.env.MONITORING_KAFKA_PUBLISHING_ENABLED !== 'false',
    outboxIntervalMs:
      options.outboxIntervalMs || Number(process.env.MONITORING_OUTBOX_INTERVAL_MS) || 5000,
  };
}

function registerMeasurementIngestion(options) {
  const deps = {
    db: options.db,
    kafkaManager: options.kafkaManager,
    logger: options.logger,
    authenticate: options.authenticate,
    syntheticAuthRequired: options.syntheticAuthRequired,
    syntheticBearerToken: options.syntheticBearerToken,
    now: options.now,
    materializeEventBundle: options.materializeEventBundle,
    setInterval: options.setInterval,
    clearInterval: options.clearInterval,
    config: monitoringConfig(options),
  };
  deps.ready = ensureMeasurementIngestionIndexes(deps.db);
  deps.ready.catch(() => {
    deps.logger.error('[MonitoringIngestion] index initialization failed code=INDEX_SETUP_FAILED');
  });

  options.app.post('/v1/measurement-batches', measurementBatchHandler(deps));
  let timer = null;
  if (deps.config.publishingEnabled && deps.kafkaManager && deps.config.outboxIntervalMs > 0) {
    timer = setInterval(() => {
      flushMeasurementOutbox(deps).catch(() => {
        deps.logger.warn('[MonitoringIngestion] outbox sweep failed code=OUTBOX_SWEEP_FAILED');
      });
    }, deps.config.outboxIntervalMs);
    if (timer.unref) {
      timer.unref();
    }
  }

  return {
    deps,
    flush: () => flushMeasurementOutbox(deps),
    stop: () => {
      if (timer) {
        clearInterval(timer);
      }
    },
  };
}

module.exports = {
  DEFAULT_TOPIC,
  IngestionError,
  ensureMeasurementIngestionIndexes,
  flushMeasurementOutbox,
  ingestMeasurementBatch,
  measurementBatchHandler,
  monitoringConfig,
  operationOutcome,
  publishOutboxEvent,
  registerMeasurementIngestion,
};
