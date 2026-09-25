'use strict';

const crypto = require('crypto');
const {
  DEFAULT_TOPIC,
  ensureMeasurementIngestionIndexes,
  flushMeasurementOutbox,
  ingestMeasurementBatch,
} = require('./measurement-ingestion');

const PATIENT_COLLECTION = 'Patient_4_0_0';
const SUPABASE_IDENTIFIER_SYSTEM = 'urn:saludata:supabase-users';
const PATIENT_REF = /^pt_[a-f0-9]{32}$/;
const ACTOR_REF = /^usr_[a-f0-9]{32}$/;
const SUPABASE_USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_PROVISION_RESPONSE_BYTES = 16 * 1024;
const DEFAULT_PROVISION_TIMEOUT_MS = 5000;
const SHADOW_SOURCES = Object.freeze({
  smart_ring: Object.freeze({
    kind: 'smart_ring',
    transport: 'synthetic',
    manufacturer_code: 'SALUDATA_FHIR_RING',
    firmware_ref: 'fw_fhir_shadow_v1',
  }),
  smart_scale: Object.freeze({
    kind: 'smart_scale',
    transport: 'synthetic',
    manufacturer_code: 'SALUDATA_FHIR_SCALE',
    firmware_ref: 'fw_fhir_shadow_v1',
  }),
});
const SHADOW_QUALITY = Object.freeze({
  status: 'usable',
  score: 0.75,
  artifact_codes: [],
});
const FHIR_PATIENT_REFERENCE = /^Patient\/([A-Za-z0-9.-]{1,64})$/;
const SUPPORTED_OBSERVATIONS = Object.freeze({
  '8867-4': Object.freeze({
    measurementCode: 'heart_rate',
    sourceKind: 'smart_ring',
    unit: 'beats/min',
    acceptedUnits: new Set(['/min', 'beats/min', 'bpm']),
  }),
  '29463-7': Object.freeze({
    measurementCode: 'body_weight',
    sourceKind: 'smart_scale',
    unit: 'kg',
    acceptedUnits: new Set(['kg']),
  }),
});

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function collection(db, name) {
  return db.collection(name);
}

function warn(logger, message) {
  if (logger && typeof logger.warn === 'function') {
    logger.warn(message);
  }
}

function codingFor(observation) {
  const codings = observation && observation.code && observation.code.coding;
  if (!Array.isArray(codings)) {
    return null;
  }
  return codings.find(
    coding =>
      coding && coding.system === 'http://loinc.org' && SUPPORTED_OBSERVATIONS[coding.code],
  );
}

function normalizedUnit(valueQuantity) {
  if (!valueQuantity || typeof valueQuantity !== 'object') {
    return null;
  }
  if (typeof valueQuantity.code === 'string' && valueQuantity.code) {
    return valueQuantity.code;
  }
  return typeof valueQuantity.unit === 'string' ? valueQuantity.unit : null;
}

function observationTimestamp(observation) {
  const candidate = observation.effectiveDateTime || observation.issued;
  if (typeof candidate !== 'string' || !/Z$/.test(candidate)) {
    return null;
  }
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function patientReferenceFromObservation(observation) {
  const reference =
    observation && observation.subject && typeof observation.subject.reference === 'string'
      ? observation.subject.reference
      : null;
  return reference && FHIR_PATIENT_REFERENCE.test(reference) ? reference : null;
}

function measurementFromObservation(observation) {
  if (!observation || observation.resourceType !== 'Observation') {
    return null;
  }
  if (!['final', 'amended'].includes(observation.status)) {
    return null;
  }
  const coding = codingFor(observation);
  if (!coding) {
    return null;
  }
  const definition = SUPPORTED_OBSERVATIONS[coding.code];
  const valueQuantity = observation.valueQuantity;
  const unit = normalizedUnit(valueQuantity);
  if (
    !valueQuantity ||
    typeof valueQuantity.value !== 'number' ||
    !Number.isFinite(valueQuantity.value) ||
    !definition.acceptedUnits.has(unit)
  ) {
    return null;
  }
  const subjectReference = patientReferenceFromObservation(observation);
  const occurredAt = observationTimestamp(observation);
  if (!subjectReference || !occurredAt) {
    return null;
  }
  return {
    subjectReference,
    occurredAt,
    sourceKind: definition.sourceKind,
    measurement: {
      code: definition.measurementCode,
      value: valueQuantity.value,
      unit: definition.unit,
      quality: Object.assign({}, SHADOW_QUALITY),
    },
  };
}

function supportedMeasurementsFromFhir(payload) {
  const resources =
    payload && payload.resourceType === 'Bundle' && Array.isArray(payload.entry)
      ? payload.entry.map(entry => entry && entry.resource)
      : [payload];
  return resources.map(measurementFromObservation).filter(Boolean);
}

function patientIdFromReference(patientReference) {
  const match =
    typeof patientReference === 'string' ? patientReference.match(FHIR_PATIENT_REFERENCE) : null;
  if (!match) {
    throw new Error('FHIR Patient reference is invalid.');
  }
  return match[1];
}

function supabaseUserIdFromPatient(patient) {
  const identifiers = Array.isArray(patient && patient.identifier)
    ? patient.identifier.filter(
      identifier =>
        identifier &&
        identifier.system === SUPABASE_IDENTIFIER_SYSTEM &&
        typeof identifier.value === 'string',
    )
    : [];
  if (identifiers.length !== 1 || !SUPABASE_USER_ID.test(identifiers[0].value.toLowerCase())) {
    throw new Error('FHIR Patient is not linked to one valid Supabase identity.');
  }
  return identifiers[0].value;
}

function monitoringIdentityKey(supabaseUserId, env) {
  const key = env && env.MONITORING_IDENTITY_HMAC_KEY;
  if (typeof key !== 'string' || key.length < 32) {
    throw new Error('Monitoring identity pseudonymisation is unavailable.');
  }
  return crypto.createHmac('sha256', key).update(supabaseUserId).digest('hex');
}

function configuredClinicianActorRef(env) {
  const actorRef = env && env.MONITORING_PROVISIONING_CLINICIAN_ACTOR_REF;
  if (typeof actorRef !== 'string' || !ACTOR_REF.test(actorRef)) {
    throw new Error('Monitoring provisioning clinician identity is unavailable.');
  }
  return actorRef;
}

async function readProvisionResponse(response) {
  const declaredLength = Number(
    response && response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('content-length') || 0
      : 0,
  );
  if (declaredLength > MAX_PROVISION_RESPONSE_BYTES) {
    throw new Error('Monitoring provisioning returned an oversized response.');
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_PROVISION_RESPONSE_BYTES) {
    throw new Error('Monitoring provisioning returned an oversized response.');
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    void error;
    throw new Error('Monitoring provisioning returned an invalid response.');
  }
  if (!response.ok || !payload || !PATIENT_REF.test(payload.patient_ref || '')) {
    throw new Error('Monitoring patient identity provisioning is unavailable.');
  }
  if (!ACTOR_REF.test(payload.actor_ref || '')) {
    throw new Error('Monitoring provisioning returned an invalid actor identity.');
  }
  return payload.patient_ref;
}

async function resolveCanonicalMonitoringPatientRef(options) {
  const settings = options || {};
  const patientId = patientIdFromReference(settings.patientReference);
  const patient = await collection(settings.db, PATIENT_COLLECTION).findOne({ id: patientId });
  if (!patient || patient.resourceType !== 'Patient') {
    throw new Error('FHIR Patient cannot be resolved for monitoring.');
  }
  const supabaseUserId = supabaseUserIdFromPatient(patient);
  const env = settings.env || process.env;
  const url = env.MONITORING_PROVISION_URL;
  const token = env.MONITORING_PROVISION_TOKEN;
  if (typeof url !== 'string' || !url || typeof token !== 'string' || token.length < 32) {
    throw new Error('Monitoring identity provisioning is unavailable.');
  }
  const fetchImpl = settings.fetchImpl || global.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('Monitoring identity provisioning is unavailable.');
  }
  const timeoutMs = Number(env.PATIENT_PROVISIONING_UPSTREAM_TIMEOUT_MS) ||
    DEFAULT_PROVISION_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (timeout && typeof timeout.unref === 'function') {
    timeout.unref();
  }
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity_key: monitoringIdentityKey(supabaseUserId, env),
        clinician_actor_ref: configuredClinicianActorRef(env),
      }),
      redirect: 'error',
      signal: controller.signal,
    });
  } catch (error) {
    void error;
    throw new Error('Monitoring identity provisioning is unavailable.');
  } finally {
    clearTimeout(timeout);
  }
  return readProvisionResponse(response);
}

function deterministicDeviceRef(patientRef, sourceKind) {
  if (!PATIENT_REF.test(patientRef || '') || !SHADOW_SOURCES[sourceKind]) {
    throw new Error('Unable to derive the monitoring device reference.');
  }
  return `dev_${sha256(`saludata:fhir-shadow-device:v1:${patientRef}:${sourceKind}`).slice(0, 32)}`;
}

function eventId() {
  return `evt_${crypto.randomUUID()}`;
}

function correlationId() {
  return `corr_${crypto.randomUUID()}`;
}

function batchId() {
  return `batch_${crypto.randomUUID()}`;
}

function internalRequest(batch) {
  const idempotencyKey = `fhir-shadow-${crypto.randomUUID()}`;
  return {
    body: batch,
    headers: { 'idempotency-key': idempotencyKey },
    get(name) {
      return this.headers[String(name).toLowerCase()];
    },
  };
}

function shadowIngestionDependencies(options) {
  const base = options || {};
  const deps = {
    db: base.db,
    kafkaManager: base.kafkaManager,
    logger: base.logger,
    now: base.now,
    materializeEventBundle: base.materializeEventBundle,
    setInterval: base.setInterval,
    clearInterval: base.clearInterval,
    // This projection is deliberately independent of the process environment.
    // It can never be promoted to a clinical path through configuration.
    config: {
      mode: 'synthetic',
      topic: DEFAULT_TOPIC,
      syntheticAuthRequired: false,
      syntheticBearerToken: undefined,
      publishingEnabled: Boolean(base.kafkaManager),
      outboxIntervalMs: 0,
    },
  };
  deps.ready = ensureMeasurementIngestionIndexes(deps.db);
  return deps;
}

function createFhirObservationShadowAdapter(options) {
  const settings = options || {};
  const deps = shadowIngestionDependencies(settings);
  const now = typeof settings.now === 'function' ? settings.now : () => new Date();
  const resolveMonitoringPatientRef =
    settings.resolveMonitoringPatientRef || resolveCanonicalMonitoringPatientRef;
  const schedule = settings.setInterval || setInterval;
  const cancel = settings.clearInterval || clearInterval;
  let retryTimer = null;

  if (deps.config.publishingEnabled) {
    retryTimer = schedule(() => {
      flushMeasurementOutbox(deps).catch(() => {
        warn(settings.logger, '[FhirShadowAdapter] outbox sweep deferred code=FHIR_SHADOW_OUTBOX_FAILED');
      });
    }, 5000);
    if (retryTimer && typeof retryTimer.unref === 'function') {
      retryTimer.unref();
    }
  }

  async function ingest(payload) {
    await deps.ready;
    const candidates = supportedMeasurementsFromFhir(payload);
    if (candidates.length === 0) {
      return { accepted: 0, skipped: true };
    }

    const receivedAt = now();
    const events = [];
    for (const candidate of candidates) {
      const patientRef = await resolveMonitoringPatientRef({
        db: deps.db,
        patientReference: candidate.subjectReference,
        env: settings.env || process.env,
        fetchImpl: settings.fetchImpl,
      });
      if (!PATIENT_REF.test(patientRef || '')) {
        throw new Error('Monitoring identity resolver returned an invalid patient reference.');
      }
      const occurredAtMs = Date.parse(candidate.occurredAt);
      const producedAt = new Date(Math.max(receivedAt.getTime(), occurredAtMs)).toISOString();
      events.push({
        schema_version: 'saludata.measurement-event.v1',
        event_id: eventId(),
        event_type: 'measurement.recorded',
        correlation_id: correlationId(),
        patient_ref: patientRef,
        device_ref: deterministicDeviceRef(patientRef, candidate.sourceKind),
        occurred_at: candidate.occurredAt,
        produced_at: producedAt,
        source: Object.assign({}, SHADOW_SOURCES[candidate.sourceKind]),
        measurements: [candidate.measurement],
        synthetic: true,
        mode: 'shadow',
        clinical_use: false,
      });
    }

    const ack = await ingestMeasurementBatch(
      internalRequest({
        schema_version: 'saludata.measurement-batch.v1',
        batch_id: batchId(),
        events,
      }),
      deps,
    );
    return { accepted: events.length, ack };
  }

  function middleware(req, res, next) {
    const path = String(req.path || req.originalUrl || '').split('?')[0];
    const isFhirWrite =
      req.method === 'POST' &&
      (path === '/4_0_0/Observation' || path === '/4_0_0' || path === '/4_0_0/Bundle');
    const hasSupportedPayload = supportedMeasurementsFromFhir(req.body).length > 0;
    if (!isFhirWrite || !hasSupportedPayload) {
      next();
      return;
    }
    res.once('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }
      ingest(req.body).catch(() => {
        warn(settings.logger, '[FhirShadowAdapter] projection deferred code=FHIR_SHADOW_PROJECTION_FAILED');
      });
    });
    next();
  }

  return {
    deps,
    ingest,
    middleware,
    stop() {
      if (retryTimer) {
        cancel(retryTimer);
        retryTimer = null;
      }
    },
  };
}

module.exports = {
  PATIENT_COLLECTION,
  SHADOW_SOURCES,
  createFhirObservationShadowAdapter,
  deterministicDeviceRef,
  measurementFromObservation,
  monitoringIdentityKey,
  resolveCanonicalMonitoringPatientRef,
  supabaseUserIdFromPatient,
  supportedMeasurementsFromFhir,
  warn,
};
