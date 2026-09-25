'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { WebSocketServer } = require('ws');

const SCHEMA_REALTIME = 'saludata-sports-realtime.v1';
const SCHEMA_EXPORT = 'saludata-sports-export.v1';
const DEFAULT_REALTIME_TOPIC = 'saludata.sports.ecg.realtime';
const DEFAULT_POST_SESSION_TOPIC = 'saludata.sports.ecg.post_session';
const DEFAULT_MODEL_EVENTS_TOPIC = 'saludata.sports.ecg.model_events';
const SPORTS_EVENT_PUBLISHING_ENV = 'SPORTS_ECG_EVENT_PUBLISHING_ENABLED';
const ATHLETE_IDENTIFIER_SYSTEM = 'urn:saludata:supabase-users';
const PATIENT_ENSURE_TTL_MS = 10 * 60 * 1000;
const MIN_PLAUSIBLE_SAMPLE_TIME_MS = Date.UTC(2020, 0, 1);
const SAMPLE_REFERENCE_DRIFT_MS = 7 * 24 * 60 * 60 * 1000;

let supabaseClient = null;
const patientEnsureCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function parseDateMs(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPlausibleSampleTime(value, reference) {
  const valueMs = parseDateMs(value);
  if (valueMs === null || valueMs < MIN_PLAUSIBLE_SAMPLE_TIME_MS) {
    return false;
  }
  if (valueMs > Date.now() + 5 * 60 * 1000) {
    return false;
  }

  const referenceMs = parseDateMs(reference);
  return referenceMs === null || Math.abs(valueMs - referenceMs) <= SAMPLE_REFERENCE_DRIFT_MS;
}

function fallbackSampleTimeIso(batch, sampleIndex, sampleCount, sampleRateHz, receivedAt) {
  const anchorMs =
    parseDateMs(batch && batch.createdAt) ||
    parseDateMs(receivedAt) ||
    Date.now();
  const rate = Number.isFinite(sampleRateHz) && sampleRateHz > 0 ? sampleRateHz : 130;
  const offsetFromAnchorMs = Math.max(0, sampleCount - 1 - sampleIndex) * (1000 / rate);
  return new Date(anchorMs - offsetFromAnchorMs).toISOString();
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  supabaseClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseClient;
}

function bearerTokenFromHeaders(headers) {
  const raw = headers.authorization || headers.Authorization || '';
  const match = String(raw).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function authenticateHeaders(headers) {
  const token = bearerTokenFromHeaders(headers);
  if (!token) {
    const error = new Error('Missing bearer token');
    error.statusCode = 401;
    throw error;
  }

  const supabase = getSupabaseClient();
  const result = await supabase.auth.getUser(token);
  if (result.error || !result.data || !result.data.user) {
    const error = new Error('Invalid or expired bearer token');
    error.statusCode = 401;
    throw error;
  }

  const user = result.data.user;
  const metadata = user.user_metadata || {};
  const displayName =
    metadata.full_name || metadata.name || metadata.display_name || metadata.preferred_username;

  return {
    id: user.id,
    email: user.email || null,
    displayName: typeof displayName === 'string' ? displayName : null,
  };
}

function operationOutcome(status, code, text) {
  return {
    status,
    body: {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: status >= 400 ? 'error' : 'information',
          code,
          details: { text },
        },
      ],
    },
  };
}

function sendOutcome(res, status, code, text, extra) {
  const outcome = operationOutcome(status, code, text).body;
  if (extra) {
    outcome.extension = [
      {
        url: 'https://saludata.eu/fhir/StructureDefinition/sports-ingestion-result',
        valueString: JSON.stringify(extra),
      },
    ];
  }
  res.status(status).json(outcome);
}

function collection(db, name) {
  return db.collection(name);
}

async function upsertFhirResource(db, resource) {
  if (!resource || !resource.resourceType || !resource.id) {
    return false;
  }

  const collectionName = `${resource.resourceType}_4_0_0`;
  const historyCollectionName = `${resource.resourceType}_4_0_0_History`;
  const doc = Object.assign({}, resource);
  if (doc._id) {
    delete doc._id;
  }

  await collection(db, collectionName).updateOne(
    { id: resource.id },
    { $set: doc },
    { upsert: true }
  );
  await collection(db, historyCollectionName).updateOne(
    { id: resource.id },
    { $set: doc },
    { upsert: true }
  );
  return true;
}

function displayNameForAuthUser(authUser) {
  if (authUser.displayName) {
    return authUser.displayName;
  }
  if (authUser.email) {
    return authUser.email;
  }
  return `Saludata Sports ${authUser.id.slice(0, 8)}`;
}

function humanNameForAuthUser(authUser, existingNames) {
  if (Array.isArray(existingNames) && existingNames.length > 0) {
    return existingNames;
  }

  const displayName = displayNameForAuthUser(authUser);
  const localPart = authUser.email ? authUser.email.split('@')[0] : displayName;
  const nameParts = displayName.includes('@')
    ? [localPart]
    : displayName.split(/\s+/).filter(Boolean);

  return [
    {
      use: 'usual',
      text: displayName,
      given: nameParts.length > 1 ? nameParts.slice(0, -1) : nameParts,
      family: nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined,
    },
  ];
}

function mergeSupabaseIdentifier(identifiers, userId) {
  const merged = Array.isArray(identifiers)
    ? identifiers.filter(identifier => identifier && typeof identifier === 'object')
    : [];
  const index = merged.findIndex(
    identifier =>
      identifier.system === ATHLETE_IDENTIFIER_SYSTEM || identifier.value === userId
  );
  const supabaseIdentifier = {
    use: 'official',
    system: ATHLETE_IDENTIFIER_SYSTEM,
    value: userId,
  };

  if (index >= 0) {
    merged[index] = Object.assign({}, merged[index], supabaseIdentifier);
    return merged;
  }

  return [supabaseIdentifier, ...merged];
}

function mergeEmailTelecom(telecom, email) {
  const merged = Array.isArray(telecom)
    ? telecom.filter(item => item && typeof item === 'object')
    : [];
  if (!email) {
    return merged;
  }

  const index = merged.findIndex(item => item.system === 'email' && item.value === email);
  if (index >= 0) {
    merged[index] = Object.assign({}, merged[index], {
      system: 'email',
      value: email,
      use: merged[index].use || 'home',
    });
    return merged;
  }

  return [
    {
      system: 'email',
      value: email,
      use: 'home',
    },
    ...merged,
  ];
}

async function findAuthenticatedPatient(db, authUser) {
  const patients = collection(db, 'Patient_4_0_0');
  return patients.findOne({
    $or: [
      { id: authUser.id },
      {
        identifier: {
          $elemMatch: {
            system: ATHLETE_IDENTIFIER_SYSTEM,
            value: authUser.id,
          },
        },
      },
    ],
  });
}

function buildAuthenticatedPatient(authUser, existingPatient) {
  const patient = Object.assign({}, existingPatient || {});
  if (patient._id) {
    delete patient._id;
  }

  const now = nowIso();
  const previousVersion = Number.parseInt(
    patient.meta && patient.meta.versionId ? patient.meta.versionId : '0',
    10
  );

  return Object.assign(patient, {
    resourceType: 'Patient',
    id: patient.id || authUser.id,
    active: patient.active !== undefined ? patient.active : true,
    name: humanNameForAuthUser(authUser, patient.name),
    telecom: mergeEmailTelecom(patient.telecom, authUser.email),
    identifier: mergeSupabaseIdentifier(patient.identifier, authUser.id),
    email: authUser.email || patient.email,
    meta: Object.assign({}, patient.meta || {}, {
      versionId: String(Number.isFinite(previousVersion) ? previousVersion + 1 : 1),
      lastUpdated: now,
    }),
  });
}

async function ensureAuthenticatedPatient(db, authUser) {
  const cached = patientEnsureCache.get(authUser.id);
  if (cached && Date.now() - cached.cachedAt < PATIENT_ENSURE_TTL_MS) {
    return cached.patientId;
  }

  const existingPatient = await findAuthenticatedPatient(db, authUser);
  const patient = buildAuthenticatedPatient(authUser, existingPatient);
  await upsertFhirResource(db, patient);
  patientEnsureCache.set(authUser.id, {
    cachedAt: Date.now(),
    patientId: patient.id,
  });
  return patient.id;
}

function sportsPayloadFromBundle(bundle) {
  return bundle && bundle.saludataSports ? bundle.saludataSports : {};
}

function sessionIdFromBundle(bundle) {
  const sports = sportsPayloadFromBundle(bundle);
  if (sports.session && sports.session.id) {
    return sports.session.id;
  }
  if (bundle && bundle.identifier && bundle.identifier.value) {
    return bundle.identifier.value;
  }
  return null;
}

function userIdFromSportsPayload(sports) {
  if (sports.user && sports.user.id) {
    return sports.user.id;
  }
  if (sports.session && sports.session.athleteId) {
    return sports.session.athleteId;
  }
  return null;
}

function assertUserMatches(authUser, payloadUserId) {
  if (!payloadUserId || payloadUserId !== authUser.id) {
    const error = new Error('Payload user does not match authenticated user');
    error.statusCode = 403;
    throw error;
  }
}

function sportsEventPublishingEnabled() {
  return process.env[SPORTS_EVENT_PUBLISHING_ENV] === 'true';
}

async function publish(kafkaManager, topic, message, headers, logger) {
  if (!sportsEventPublishingEnabled()) {
    return {
      published: false,
      reason: 'disabled',
    };
  }

  if (!kafkaManager) {
    return {
      published: false,
      reason: 'kafka_unavailable',
    };
  }

  try {
    await kafkaManager.send({ topic, message, headers });
    return {
      published: true,
      topic,
    };
  } catch (error) {
    logger.error(`[SportsECG] Kafka publish failed: ${error.message}`);
    return {
      published: false,
      reason: 'publish_failed',
      error: error.message,
    };
  }
}

function analysisModeFromSession(session) {
  return session && session.analysisMode ? session.analysisMode : 'post-session';
}

function ackForBatch(batch, duplicate, payloadSha256) {
  return {
    type: 'ack',
    schemaVersion: SCHEMA_REALTIME,
    sessionId: batch.sessionId,
    userId: batch.userId || batch.athleteId,
    source: batch.source,
    batchId: batch.id,
    id: batch.id,
    sequence: batch.sequence,
    accepted: true,
    status: duplicate ? 'duplicate' : 'persisted',
    duplicate: !!duplicate,
    payloadSha256,
    persistedAt: nowIso(),
  };
}

function nackForBatch(batch, code, message, retryable) {
  return {
    type: 'nack',
    schemaVersion: SCHEMA_REALTIME,
    sessionId: batch && batch.sessionId,
    batchId: batch && batch.id,
    id: batch && batch.id,
    sequence: batch && batch.sequence,
    accepted: false,
    retryable: !!retryable,
    code,
    message,
  };
}

function validateRealtimeBatch(batch, authUser, queryUserId) {
  if (!batch || batch.schemaVersion !== SCHEMA_REALTIME) {
    throw Object.assign(new Error('Invalid realtime batch schema'), {
      nackCode: 'invalid_schema',
      retryable: false,
    });
  }
  if (!batch.id || !batch.sessionId || typeof batch.sequence !== 'number') {
    throw Object.assign(new Error('Missing batch id, sessionId or sequence'), {
      nackCode: 'invalid_schema',
      retryable: false,
    });
  }

  const batchUserId = batch.userId || batch.athleteId;
  if (!batchUserId || batchUserId !== authUser.id) {
    throw Object.assign(new Error('Realtime batch user mismatch'), {
      nackCode: 'user_mismatch',
      retryable: false,
    });
  }
  if (queryUserId && queryUserId !== authUser.id) {
    throw Object.assign(new Error('Query user mismatch'), {
      nackCode: 'user_mismatch',
      retryable: false,
    });
  }
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function objectValue(value) {
  return value && typeof value === 'object' ? value : {};
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeRealtimeBatch(batch, receivedAt) {
  const signal = objectValue(objectValue(batch.signal).ecg);
  const eventTypes = new Set();
  const summary = {
    eventTypes: [],
    sampleCount: 0,
    sampleRateHz: finiteNumber(signal.sampleRateHz),
    firstSampleAt: null,
    lastSampleAt: null,
    deviceName: nonEmptyString(signal.sensor),
    lead: nonEmptyString(signal.lead),
    unit: nonEmptyString(signal.unit),
  };

  for (const rawEvent of arrayValue(batch.events)) {
    const event = objectValue(rawEvent);
    const eventType = nonEmptyString(event.type);
    if (eventType) {
      eventTypes.add(eventType);
    }
    if (eventType !== 'ecg') {
      continue;
    }

    summary.sampleRateHz = summary.sampleRateHz || finiteNumber(event.sampleRateHz);
    const samples = arrayValue(event.samples);
    const eventSampleRateHz = finiteNumber(event.sampleRateHz) || summary.sampleRateHz;
    const referenceTime = nonEmptyString(batch.createdAt) || receivedAt;
    summary.sampleCount += samples.length;
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
      const rawSample = samples[sampleIndex];
      const sample = objectValue(rawSample);
      const candidateRecordedAt = nonEmptyString(sample.recordedAt);
      const recordedAt = isPlausibleSampleTime(candidateRecordedAt, referenceTime)
        ? candidateRecordedAt
        : fallbackSampleTimeIso(batch, sampleIndex, samples.length, eventSampleRateHz, receivedAt);
      if (!summary.firstSampleAt || recordedAt < summary.firstSampleAt) {
        summary.firstSampleAt = recordedAt;
      }
      if (!summary.lastSampleAt || recordedAt > summary.lastSampleAt) {
        summary.lastSampleAt = recordedAt;
      }
    }
  }

  summary.eventTypes = Array.from(eventTypes);
  if (!summary.firstSampleAt) {
    summary.firstSampleAt = nonEmptyString(batch.createdAt);
  }
  if (!summary.lastSampleAt) {
    summary.lastSampleAt = summary.firstSampleAt;
  }

  return summary;
}

async function upsertRealtimeTrainingSession(deps, batch, authUser, patientId, realtimeSummary, receivedAt) {
  const sampleCount = realtimeSummary.sampleCount || 0;
  const firstSampleAt = realtimeSummary.firstSampleAt || receivedAt;
  const lastSampleAt = realtimeSummary.lastSampleAt || firstSampleAt;
  const analysisMode =
    batch.analysis && batch.analysis.mode ? batch.analysis.mode : 'realtime';

  await collection(deps.db, 'sports_training_sessions').updateOne(
    { id: batch.sessionId, userId: authUser.id },
    {
      $set: {
        id: batch.sessionId,
        userId: authUser.id,
        userEmail: authUser.email,
        patientId: patientId || authUser.id,
        source: batch.source || 'unknown',
        deviceMode: batch.deviceMode || null,
        analysisMode,
        lastRealtimeBatchAt: receivedAt,
        updatedAt: receivedAt,
        'analysis.status': 'collecting',
        'analysis.mode': analysisMode,
        'session.id': batch.sessionId,
        'session.source': batch.source || 'unknown',
        'session.deviceMode': batch.deviceMode || null,
        'session.analysisStatus': 'collecting',
        'session.device.name': realtimeSummary.deviceName || null,
        'session.metrics.sampleRateHz': realtimeSummary.sampleRateHz || null,
      },
      $setOnInsert: {
        createdAt: receivedAt,
        'session.title': `ECG ${String(batch.sessionId).slice(0, 8)}`,
      },
      $min: {
        'session.startedAt': firstSampleAt,
      },
      $max: {
        'session.endedAt': lastSampleAt,
      },
      $inc: {
        realtimeBatchCount: 1,
        'session.metrics.ecgSamples': sampleCount,
      },
    },
    { upsert: true }
  );
}

async function persistRealtimeBatch(deps, batch, authUser, queryUserId) {
  validateRealtimeBatch(batch, authUser, queryUserId);
  const patientId = await ensureAuthenticatedPatient(deps.db, authUser);
  const receivedAt = nowIso();
  const realtimeSummary = summarizeRealtimeBatch(batch, receivedAt);

  const payload = JSON.stringify(batch);
  const payloadSha256 = sha256Hex(payload);
  const key = {
    userId: authUser.id,
    sessionId: batch.sessionId,
    source: batch.source || 'unknown',
    batchId: batch.id,
  };
  const batches = collection(deps.db, 'sports_realtime_batches');
  const existing = await batches.findOne(key);
  if (existing) {
    if (existing.payloadSha256 === payloadSha256) {
      return ackForBatch(batch, true, payloadSha256);
    }

    throw Object.assign(new Error('Duplicate batch id with different payload'), {
      nackCode: 'duplicate_conflict',
      retryable: false,
    });
  }

  await batches.insertOne(
    Object.assign({}, key, {
      id: batch.id,
      sequence: batch.sequence,
      patientId: patientId || authUser.id,
      userProvider: batch.userProvider || null,
      deviceMode: batch.deviceMode || null,
      analysisMode:
        batch.analysis && batch.analysis.mode ? batch.analysis.mode : 'realtime',
      payloadSha256,
      receivedAt,
      status: 'persisted',
      location: batch.location || null,
      eventTypes: realtimeSummary.eventTypes,
      sampleCount: realtimeSummary.sampleCount,
      sampleRateHz: realtimeSummary.sampleRateHz,
      firstSampleAt: realtimeSummary.firstSampleAt,
      lastSampleAt: realtimeSummary.lastSampleAt,
      deviceName: realtimeSummary.deviceName,
      lead: realtimeSummary.lead,
      unit: realtimeSummary.unit,
      batch,
    })
  );
  await upsertRealtimeTrainingSession(
    deps,
    batch,
    authUser,
    patientId,
    realtimeSummary,
    receivedAt
  );
  deps.logger.info(
    `[SportsECG] realtime batch persisted user=${authUser.id} session=${batch.sessionId} batch=${batch.id} sequence=${batch.sequence} samples=${realtimeSummary.sampleCount}`
  );

  const publishResult = await publish(
    deps.kafkaManager,
    process.env.SPORTS_REALTIME_TOPIC || DEFAULT_REALTIME_TOPIC,
    {
      type: 'sports_ecg_realtime_batch',
      receivedAt,
      userId: authUser.id,
      sessionId: batch.sessionId,
      batchId: batch.id,
      sequence: batch.sequence,
      patientId: patientId || authUser.id,
      payloadSha256,
      realtimeSummary,
      batch,
    },
    {
      userId: authUser.id,
      sessionId: batch.sessionId,
      batchId: batch.id,
    },
    deps.logger
  );

  return Object.assign(ackForBatch(batch, false, payloadSha256), {
    eventPublishing: publishResult,
  });
}

async function createTrainingSession(req, res, deps) {
  try {
    const authUser = await authenticateHeaders(req.headers);
    const bundle = req.body || {};
    if (bundle.resourceType !== 'Bundle') {
      sendOutcome(res, 400, 'structure', 'Expected FHIR Bundle payload');
      return;
    }

    const sessionId = sessionIdFromBundle(bundle);
    const sports = sportsPayloadFromBundle(bundle);
    const userId = userIdFromSportsPayload(sports);
    assertUserMatches(authUser, userId);

    if (!sessionId) {
      sendOutcome(res, 400, 'required', 'Missing Saludata Sports session id');
      return;
    }

    const resources = Array.isArray(bundle.entry)
      ? bundle.entry.map(entry => entry && entry.resource).filter(Boolean)
      : [];
    let fhirResources = 0;
    for (const resource of resources) {
      if (await upsertFhirResource(deps.db, resource)) {
        fhirResources += 1;
      }
    }
    const patientId = await ensureAuthenticatedPatient(deps.db, authUser);

    const sessionDoc = sports.session || {};
    const analysis = sports.analysis || {};
    await collection(deps.db, 'sports_training_sessions').updateOne(
      { id: sessionId, userId: authUser.id },
      {
        $set: {
          id: sessionId,
          userId: authUser.id,
          userEmail: authUser.email,
          source: sessionDoc.source || null,
          deviceMode: sessionDoc.deviceMode || null,
          analysisMode: analysisModeFromSession(sessionDoc),
          analysis,
          manifest: sports.manifest || null,
          clinicalSignalContract: sports.clinicalSignalContract || null,
          patientId: patientId || authUser.id,
          updatedAt: nowIso(),
          bundle,
        },
        $setOnInsert: {
          createdAt: nowIso(),
        },
      },
      { upsert: true }
    );

    const publishResult = await publish(
      deps.kafkaManager,
      process.env.SPORTS_POST_SESSION_TOPIC || DEFAULT_POST_SESSION_TOPIC,
      {
        type: 'sports_training_session_registered',
        schemaVersion: SCHEMA_EXPORT,
        userId: authUser.id,
        sessionId,
        analysis,
        manifest: sports.manifest || null,
      },
      { userId: authUser.id, sessionId },
      deps.logger
    );

    sendOutcome(res, 202, 'informational', 'Training session accepted', {
      sessionId,
      patientId: patientId || authUser.id,
      fhirResources,
      eventPublishing: publishResult,
    });
  } catch (error) {
    sendOutcome(
      res,
      error.statusCode || 500,
      error.statusCode === 401 ? 'login' : 'exception',
      error.message
    );
  }
}

function requestBodyBuffer(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }
  return Buffer.alloc(0);
}

async function uploadChunk(req, res, deps) {
  try {
    const authUser = await authenticateHeaders(req.headers);
    const sessionId = req.params.sessionId;
    const athleteId = req.get('X-Saludata-Athlete-Id');
    assertUserMatches(authUser, athleteId);
    const patientId = await ensureAuthenticatedPatient(deps.db, authUser);

    const body = requestBodyBuffer(req);
    if (!body.length) {
      sendOutcome(res, 400, 'required', 'Chunk body is empty');
      return;
    }

    const sha256 = sha256Hex(body);
    const expectedSha256 = req.get('X-Chunk-Sha256');
    if (expectedSha256 && expectedSha256 !== sha256) {
      sendOutcome(res, 409, 'conflict', 'Chunk sha256 does not match body');
      return;
    }

    const chunkName = req.get('X-Chunk-Name') || `${sha256}.jsonl`;
    const key = {
      userId: authUser.id,
      sessionId,
      chunkName,
    };
    const chunks = collection(deps.db, 'sports_session_chunks');
    const existing = await chunks.findOne(key);
    if (existing && existing.sha256 && existing.sha256 !== sha256) {
      sendOutcome(res, 409, 'conflict', 'Chunk name already exists with a different sha256');
      return;
    }

    await chunks.updateOne(
      key,
      {
        $set: {
          kind: req.get('X-Chunk-Kind') || 'ecg',
          bytes: body.length,
          sha256,
          source: req.get('X-Source') || null,
          deviceMode: req.get('X-Device-Mode') || null,
          analysisMode: req.get('X-Analysis-Mode') || 'post-session',
          patientId: patientId || authUser.id,
          contentType: req.get('Content-Type') || 'application/x-ndjson',
          payload: body.toString('utf8'),
          updatedAt: nowIso(),
        },
        $setOnInsert: {
          createdAt: nowIso(),
        },
      },
      { upsert: true }
    );

    const publishResult = await publish(
      deps.kafkaManager,
      process.env.SPORTS_POST_SESSION_TOPIC || DEFAULT_POST_SESSION_TOPIC,
      {
        type: 'sports_ecg_chunk_uploaded',
        userId: authUser.id,
        patientId: patientId || authUser.id,
        sessionId,
        chunkName,
        sha256,
        bytes: body.length,
      },
      { userId: authUser.id, sessionId, chunkName },
      deps.logger
    );

    sendOutcome(res, existing ? 200 : 202, 'informational', 'ECG chunk accepted', {
      sessionId,
      chunkName,
      sha256,
      duplicate: !!existing,
      eventPublishing: publishResult,
    });
  } catch (error) {
    sendOutcome(
      res,
      error.statusCode || 500,
      error.statusCode === 401 ? 'login' : 'exception',
      error.message
    );
  }
}

async function recordPostSessionAnalysisRequest(req, res, deps) {
  try {
    const authUser = await authenticateHeaders(req.headers);
    const sessionId = req.params.sessionId;
    const athleteId = req.get('X-Saludata-Athlete-Id') || req.body.userId;
    assertUserMatches(authUser, athleteId);
    const patientId = await ensureAuthenticatedPatient(deps.db, authUser);

    const requestId = `post-session:${authUser.id}:${sessionId}`;
    const requestedAt = nowIso();
    const analysisRequest = {
      id: requestId,
      type: 'sports_ecg_post_session_analysis_request',
      schemaVersion: SCHEMA_EXPORT,
      userId: authUser.id,
      patientId: patientId || authUser.id,
      sessionId,
      analysisMode: req.body.analysisMode || 'post-session',
      pipeline: req.body.pipeline || 'saludata-ecg-ischemia-offline.v1',
      evidenceProfile: req.body.evidenceProfile || null,
      chunks: Array.isArray(req.body.chunks) ? req.body.chunks : [],
      status: 'stored',
      requestedAt,
    };

    const publishResult = await publish(
      deps.kafkaManager,
      process.env.SPORTS_MODEL_EVENTS_TOPIC || DEFAULT_MODEL_EVENTS_TOPIC,
      Object.assign({}, analysisRequest, {
        type: 'sports_ecg_post_session_analysis_requested',
      }),
      { userId: authUser.id, sessionId },
      deps.logger
    );

    const status = publishResult.published ? 'queued' : 'stored';
    await collection(deps.db, 'sports_analysis_requests').updateOne(
      { id: requestId },
      {
        $set: Object.assign({}, analysisRequest, {
          status,
          eventPublishing: publishResult,
          updatedAt: nowIso(),
        }),
        $setOnInsert: {
          createdAt: requestedAt,
        },
      },
      { upsert: true }
    );

    res.status(202).json({
      accepted: true,
      requestId,
      sessionId,
      status,
      eventPublishing: publishResult,
    });
  } catch (error) {
    sendOutcome(
      res,
      error.statusCode || 500,
      error.statusCode === 401 ? 'login' : 'exception',
      error.message
    );
  }
}

async function ingestionStatus(req, res) {
  try {
    const authUser = await authenticateHeaders(req.headers);
    const sessionId = req.params.sessionId;
    const filter = { userId: authUser.id, sessionId };
    const db = req.app.locals.sportsEcgDb;

    const session = await collection(db, 'sports_training_sessions').findOne({
      id: sessionId,
      userId: authUser.id,
    });
    const chunks = await collection(db, 'sports_session_chunks').countDocuments(filter);
    const realtimeBatches = await collection(db, 'sports_realtime_batches').countDocuments(filter);
    const analysisRequest = await collection(db, 'sports_analysis_requests')
      .find(filter)
      .sort({ requestedAt: -1 })
      .limit(1)
      .next();

    res.status(200).json({
      sessionId,
      userId: authUser.id,
      sessionStored: !!session,
      chunks,
      realtimeBatches,
      analysisRequest: analysisRequest
        ? {
            id: analysisRequest.id,
            status: analysisRequest.status,
            pipeline: analysisRequest.pipeline,
            eventPublishing: analysisRequest.eventPublishing,
            requestedAt: analysisRequest.requestedAt,
          }
        : null,
    });
  } catch (error) {
    sendOutcome(
      res,
      error.statusCode || 500,
      error.statusCode === 401 ? 'login' : 'exception',
      error.message
    );
  }
}

async function realtimeBatchHttp(req, res, deps) {
  const batch = req.body && req.body.batch ? req.body.batch : req.body;
  try {
    const authUser = await authenticateHeaders(req.headers);
    const ack = await persistRealtimeBatch(
      deps,
      batch,
      authUser,
      req.query.userId || null
    );
    res.status(202).json(ack);
  } catch (error) {
    deps.logger.warn(
      `[SportsECG] realtime batch rejected session=${batch && batch.sessionId ? batch.sessionId : 'unknown'} batch=${batch && batch.id ? batch.id : 'unknown'} code=${error.nackCode || error.statusCode || 'internal_error'} message=${error.message}`
    );
    res.status(error.statusCode || 422).json(
      nackForBatch(
        batch,
        error.nackCode || 'internal_error',
        error.message,
        error.retryable !== false
      )
    );
  }
}

function ensureSportsEcgIndexes(db, logger) {
  Promise.all([
    collection(db, 'sports_realtime_batches').createIndex(
      { userId: 1, sessionId: 1, source: 1, batchId: 1 },
      { unique: true, name: 'sports_realtime_batch_identity' }
    ),
    collection(db, 'sports_realtime_batches').createIndex(
      { userId: 1, sessionId: 1, sequence: 1, receivedAt: 1 },
      { name: 'sports_realtime_session_sequence' }
    ),
    collection(db, 'sports_session_chunks').createIndex(
      { userId: 1, sessionId: 1, chunkName: 1 },
      { unique: true, name: 'sports_session_chunk_identity' }
    ),
    collection(db, 'sports_training_sessions').createIndex(
      { userId: 1, id: 1 },
      { unique: true, name: 'sports_training_session_identity' }
    ),
    collection(db, 'sports_training_sessions').createIndex(
      { patientId: 1, updatedAt: -1 },
      { name: 'sports_training_session_patient_updated' }
    ),
  ]).catch((error) => {
    logger.warn(`[SportsECG] index setup skipped: ${error.message}`);
  });
}

function registerSportsEcgIngestion(options) {
  const app = options.app;
  const express = options.express;
  const deps = {
    db: options.db,
    kafkaManager: options.kafkaManager,
    logger: options.logger,
  };
  app.locals.sportsEcgDb = options.db;
  ensureSportsEcgIndexes(options.db, options.logger);
  const rawChunkParser = express.raw({
    type: ['application/x-ndjson', 'text/plain', 'application/octet-stream'],
    limit: process.env.SPORTS_ECG_CHUNK_LIMIT || '50mb',
  });

  app.post(['/4_0_0/training-sessions', '/sports/training-sessions'], function (req, res) {
    createTrainingSession(req, res, deps);
  });
  app.post(
    [
      '/4_0_0/training-sessions/:sessionId/chunks',
      '/sports/training-sessions/:sessionId/chunks',
    ],
    rawChunkParser,
    function (req, res) {
      uploadChunk(req, res, deps);
    }
  );
  app.post(
    [
      '/4_0_0/training-sessions/:sessionId/analysis',
      '/sports/training-sessions/:sessionId/analysis',
    ],
    function (req, res) {
      recordPostSessionAnalysisRequest(req, res, deps);
    }
  );
  app.post(['/sports/realtime/batches'], function (req, res) {
    realtimeBatchHttp(req, res, deps);
  });
  app.get(
    ['/4_0_0/training-sessions/:sessionId/ingestion-status', '/sports/training-sessions/:sessionId/ingestion-status'],
    ingestionStatus
  );
}

function websocketQuery(requestUrl) {
  return new URL(requestUrl || '/', 'http://localhost');
}

function attachSportsRealtimeWebSocket(server, options) {
  const deps = {
    db: options.db,
    kafkaManager: options.kafkaManager,
    logger: options.logger,
  };
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async function (req, socket, head) {
    const parsed = websocketQuery(req.url);
    if (parsed.pathname !== '/sports/training') {
      return;
    }

    try {
      const authUser = await authenticateHeaders(req.headers);
      wss.handleUpgrade(req, socket, head, function (ws) {
        wss.emit('connection', ws, req, authUser, parsed);
      });
    } catch (error) {
      options.logger.warn(`[SportsECG] realtime socket auth failed: ${error.message}`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', function (ws, req, authUser, parsed) {
    const queryUserId = parsed.searchParams.get('userId');
    options.logger.info(`[SportsECG] realtime socket connected for user ${authUser.id}`);

    ws.on('message', async function (raw) {
      let batch = null;
      try {
        const envelope = JSON.parse(raw.toString('utf8'));
        batch = envelope && envelope.batch ? envelope.batch : envelope;
        const ack = await persistRealtimeBatch(deps, batch, authUser, queryUserId);
        ws.send(JSON.stringify(ack));
      } catch (error) {
        ws.send(
          JSON.stringify(
            nackForBatch(
              batch,
              error.nackCode || 'internal_error',
              error.message,
              error.retryable !== false
            )
          )
        );
      }
    });

    ws.on('close', function () {
      options.logger.info(`[SportsECG] realtime socket closed for user ${authUser.id}`);
    });
    req.socket.on('error', function () {});
  });
}

module.exports = {
  attachSportsRealtimeWebSocket,
  registerSportsEcgIngestion,
};
