'use strict';

const crypto = require('crypto');

const EVENT_SCHEMA_VERSION = 'saludata.measurement-event.v1';
const BATCH_SCHEMA_VERSION = 'saludata.measurement-batch.v1';
const ACK_SCHEMA_VERSION = 'saludata.measurement-ingestion-ack.v1';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$/;
const PATIENT_REF = /^pt_[a-f0-9]{32}$/;
const DEVICE_REF = /^dev_[a-f0-9]{32}$/;
const SAFE_CODE = /^[a-z][a-z0-9_]{0,63}$/;
const MANUFACTURER_CODE = /^[A-Z0-9_]{2,40}$/;
const FIRMWARE_REF = /^fw_[A-Za-z0-9_-]{8,80}$/;
const MIN_TIMESTAMP_MS = Date.UTC(2020, 0, 1);
const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000;
const MAX_BATCH_EVENTS = 100;

const SOURCE_KINDS = new Set([
  'smart_ring',
  'blood_pressure_monitor',
  'smart_scale',
  'mobile_app',
  'synthetic_device',
]);

const ACTIVITY_STATES = new Set(['rest_compatible', 'active', 'sleep', 'unknown']);
const ACTIVITY_ORIGINS = new Set(['sensor', 'clinician', 'unknown']);
const SOURCE_TRANSPORTS = new Set(['bluetooth_le', 'vendor_api', 'manual', 'synthetic']);
const QUALITY_STATUSES = new Set(['good', 'usable', 'poor', 'unknown']);
const QUALITY_ARTIFACT_CODES = new Set([
  'motion',
  'low_perfusion',
  'device_contact',
  'out_of_range',
  'clock_skew',
  'insufficient_samples',
]);
const SYMPTOM_SEVERITIES = new Set(['mild', 'moderate', 'severe', 'unknown']);
const SYMPTOM_CODES = new Set([
  'chest_pain',
  'dizziness',
  'dyspnea',
  'edema',
  'fatigue',
  'headache',
  'nausea',
  'palpitations',
  'syncope',
]);

const MEASUREMENT_DEFINITIONS = Object.freeze({
  heart_rate: {
    unit: 'beats/min',
    minimum: 20,
    maximum: 260,
  },
  oxygen_saturation: {
    unit: '%',
    minimum: 50,
    maximum: 100,
  },
  systolic_blood_pressure: {
    unit: 'mm[Hg]',
    minimum: 50,
    maximum: 280,
  },
  diastolic_blood_pressure: {
    unit: 'mm[Hg]',
    minimum: 30,
    maximum: 180,
  },
  body_weight: {
    unit: 'kg',
    minimum: 20,
    maximum: 350,
  },
  accelerometer_rms: {
    unit: 'm/s2',
    minimum: 0,
    maximum: 200,
  },
  activity_score: {
    unit: '1',
    minimum: 0,
    maximum: 1,
  },
  step_count: {
    unit: 'count',
    minimum: 0,
    maximum: 200000,
  },
});

// These are the two source/measurement invariants enforced by the canonical
// step-1 consumer (`demo/contract_events.py`). Keeping them at the HTTP
// boundary prevents valid-schema-but-unprocessable poison messages without
// narrowing the closed v1 contract beyond the consumer's own semantics.
const SOURCE_MEASUREMENT_REQUIREMENTS = Object.freeze({
  blood_pressure_monitor: Object.freeze({
    all: Object.freeze(['systolic_blood_pressure', 'diastolic_blood_pressure']),
    message: 'A blood_pressure_monitor event requires systolic and diastolic values.',
  }),
  smart_scale: Object.freeze({
    all: Object.freeze(['body_weight']),
    message: 'A smart_scale event requires body_weight.',
  }),
});

const FORBIDDEN_PII_KEYS = new Set([
  'address',
  'birthdate',
  'dateofbirth',
  'deviceid',
  'devicename',
  'deviceserial',
  'dni',
  'email',
  'firstname',
  'fullname',
  'lastname',
  'mac',
  'mrn',
  'name',
  'note',
  'patientid',
  'phone',
  'serial',
  'ssn',
  'text',
]);

class ContractValidationError extends Error {
  constructor(message, expression, code = 'invalid') {
    super(message);
    this.name = 'ContractValidationError';
    this.statusCode = 422;
    this.operationOutcomeCode = code;
    this.expression = expression ? [expression] : undefined;
  }
}

function fail(message, expression, code) {
  throw new ContractValidationError(message, expression, code);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertObject(value, expression) {
  if (!isPlainObject(value)) {
    fail('Expected a JSON object.', expression, 'structure');
  }
}

function normalizedKey(key) {
  return String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function assertNoPiiKeys(value, expression = 'body') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoPiiKeys(entry, `${expression}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) {
    return;
  }

  Object.keys(value).forEach(key => {
    if (FORBIDDEN_PII_KEYS.has(normalizedKey(key))) {
      fail('Direct identifiers and free text are not accepted.', `${expression}.${key}`, 'security');
    }
    assertNoPiiKeys(value[key], `${expression}.${key}`);
  });
}

function assertExactKeys(value, required, optional, expression) {
  assertObject(value, expression);
  const allowed = new Set(required.concat(optional || []));
  Object.keys(value).forEach(key => {
    if (!allowed.has(key)) {
      fail('Unsupported property.', `${expression}.${key}`, 'structure');
    }
  });
  required.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail('Required property is missing.', `${expression}.${key}`, 'required');
    }
  });
}

function assertBoolean(value, expression) {
  if (typeof value !== 'boolean') {
    fail('Expected a boolean.', expression, 'value');
  }
  return value;
}

function assertNumber(value, expression, minimum, maximum) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail('Expected a finite number.', expression, 'value');
  }
  if (value < minimum || value > maximum) {
    fail(`Value must be between ${minimum} and ${maximum}.`, expression, 'value');
  }
  return value;
}

function assertSafeId(value, expression, pattern = SAFE_ID) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    fail('Expected an opaque identifier with supported characters.', expression, 'value');
  }
  return value;
}

function parseTimestamp(value, expression, nowMs) {
  if (typeof value !== 'string' || !/Z$/.test(value)) {
    fail('Expected an ISO-8601 UTC timestamp ending in Z.', expression, 'value');
  }
  const timestampMs = Date.parse(value);
  if (!Number.isFinite(timestampMs) || timestampMs < MIN_TIMESTAMP_MS) {
    fail('Timestamp is invalid or outside the supported period.', expression, 'value');
  }
  if (timestampMs > nowMs + MAX_FUTURE_DRIFT_MS) {
    fail('Timestamp is too far in the future.', expression, 'value');
  }
  return {
    iso: new Date(timestampMs).toISOString(),
    timestampMs,
  };
}

function validateQuality(raw, expression) {
  assertExactKeys(
    raw,
    ['status', 'score', 'artifact_codes'],
    ['coverage_ratio'],
    expression
  );
  if (!QUALITY_STATUSES.has(raw.status)) {
    fail('Unsupported quality status.', `${expression}.status`, 'value');
  }
  if (!Array.isArray(raw.artifact_codes) || raw.artifact_codes.length > 8) {
    fail('artifact_codes must be an array with at most 8 entries.', `${expression}.artifact_codes`, 'value');
  }
  const artifactCodes = raw.artifact_codes.map((code, index) => {
    if (typeof code !== 'string' || !SAFE_CODE.test(code) || !QUALITY_ARTIFACT_CODES.has(code)) {
      fail('Unsupported artifact code.', `${expression}.artifact_codes[${index}]`, 'value');
    }
    return code;
  });
  if (new Set(artifactCodes).size !== artifactCodes.length) {
    fail('artifact_codes cannot contain duplicates.', `${expression}.artifact_codes`, 'value');
  }

  const quality = {
    status: raw.status,
    score: assertNumber(raw.score, `${expression}.score`, 0, 1),
    artifact_codes: artifactCodes,
  };
  if (Object.prototype.hasOwnProperty.call(raw, 'coverage_ratio')) {
    quality.coverage_ratio = assertNumber(
      raw.coverage_ratio,
      `${expression}.coverage_ratio`,
      0,
      1
    );
  }
  return quality;
}

function validateMeasurement(raw, expression) {
  assertExactKeys(raw, ['code', 'value', 'unit', 'quality'], [], expression);
  const definition = MEASUREMENT_DEFINITIONS[raw.code];
  if (!definition) {
    fail('Unsupported measurement code.', `${expression}.code`, 'value');
  }
  if (raw.unit !== definition.unit) {
    fail(`Measurement ${raw.code} must use UCUM unit ${definition.unit}.`, `${expression}.unit`, 'value');
  }
  const value = assertNumber(raw.value, `${expression}.value`, definition.minimum, definition.maximum);
  return {
    code: raw.code,
    value,
    unit: raw.unit,
    quality: validateQuality(raw.quality, `${expression}.quality`),
  };
}

function validateActivityContext(raw, expression) {
  assertExactKeys(raw, ['state', 'confidence', 'origin'], [], expression);
  if (!ACTIVITY_STATES.has(raw.state)) {
    fail('Unsupported activity state.', `${expression}.state`, 'value');
  }
  if (!ACTIVITY_ORIGINS.has(raw.origin)) {
    fail('Unsupported activity origin.', `${expression}.origin`, 'value');
  }
  return {
    state: raw.state,
    confidence: assertNumber(raw.confidence, `${expression}.confidence`, 0, 1),
    origin: raw.origin,
  };
}

function validateSymptom(raw, expression, nowMs, producedAtMs) {
  assertExactKeys(raw, ['code', 'severity', 'onset_at'], [], expression);
  if (!SYMPTOM_CODES.has(raw.code)) {
    fail('Unsupported coded symptom.', `${expression}.code`, 'value');
  }
  if (!SYMPTOM_SEVERITIES.has(raw.severity)) {
    fail('Unsupported symptom severity.', `${expression}.severity`, 'value');
  }
  const onset = parseTimestamp(raw.onset_at, `${expression}.onset_at`, nowMs);
  if (onset.timestampMs > producedAtMs) {
    fail('Symptom onset cannot be after event production.', `${expression}.onset_at`, 'value');
  }
  return {
    code: raw.code,
    severity: raw.severity,
    onset_at: onset.iso,
  };
}

function validateSource(raw, expression) {
  assertExactKeys(raw, ['kind', 'transport', 'manufacturer_code'], ['firmware_ref'], expression);
  if (!SOURCE_KINDS.has(raw.kind)) {
    fail('Unsupported source kind.', `${expression}.kind`, 'value');
  }
  if (!SOURCE_TRANSPORTS.has(raw.transport)) {
    fail('Unsupported source transport.', `${expression}.transport`, 'value');
  }
  if (typeof raw.manufacturer_code !== 'string' || !MANUFACTURER_CODE.test(raw.manufacturer_code)) {
    fail('Unsupported manufacturer code.', `${expression}.manufacturer_code`, 'value');
  }
  const source = {
    kind: raw.kind,
    transport: raw.transport,
    manufacturer_code: raw.manufacturer_code,
  };
  if (Object.prototype.hasOwnProperty.call(raw, 'firmware_ref')) {
    if (typeof raw.firmware_ref !== 'string' || !FIRMWARE_REF.test(raw.firmware_ref)) {
      fail('Unsupported firmware reference.', `${expression}.firmware_ref`, 'value');
    }
    source.firmware_ref = raw.firmware_ref;
  }
  return source;
}

function validateSourceMeasurementCombination(sourceKind, measurementCodes, expression) {
  const requirement = SOURCE_MEASUREMENT_REQUIREMENTS[sourceKind];
  if (!requirement) {
    return;
  }
  const present = new Set(measurementCodes);
  if (!requirement.all.every(code => present.has(code))) {
    fail(requirement.message, expression, 'required');
  }
}

function validateEvent(raw, index, nowMs) {
  const expression = `body.events[${index}]`;
  assertExactKeys(
    raw,
    [
      'schema_version',
      'event_id',
      'event_type',
      'correlation_id',
      'patient_ref',
      'device_ref',
      'occurred_at',
      'produced_at',
      'source',
      'measurements',
      'synthetic',
      'mode',
      'clinical_use',
    ],
    ['activity_context', 'symptoms'],
    expression
  );
  if (raw.schema_version !== EVENT_SCHEMA_VERSION) {
    fail('Unsupported event schema version.', `${expression}.schema_version`, 'not-supported');
  }
  if (raw.event_type !== 'measurement.recorded') {
    fail('Unsupported event type.', `${expression}.event_type`, 'not-supported');
  }

  const source = validateSource(raw.source, `${expression}.source`);
  const occurredAt = parseTimestamp(raw.occurred_at, `${expression}.occurred_at`, nowMs);
  const producedAt = parseTimestamp(raw.produced_at, `${expression}.produced_at`, nowMs);
  if (producedAt.timestampMs < occurredAt.timestampMs) {
    fail('produced_at cannot precede occurred_at.', `${expression}.produced_at`, 'value');
  }

  if (!Array.isArray(raw.measurements) || raw.measurements.length < 1 || raw.measurements.length > 16) {
    fail('measurements must contain between 1 and 16 entries.', `${expression}.measurements`, 'structure');
  }
  const measurements = raw.measurements.map((measurement, measurementIndex) =>
    validateMeasurement(measurement, `${expression}.measurements[${measurementIndex}]`)
  );
  const measurementCodes = measurements.map(measurement => measurement.code);
  if (new Set(measurementCodes).size !== measurementCodes.length) {
    fail('Measurement codes cannot be repeated in one event.', `${expression}.measurements`, 'duplicate');
  }
  validateSourceMeasurementCombination(
    source.kind,
    measurementCodes,
    `${expression}.measurements`
  );

  const hasSystolic = measurementCodes.includes('systolic_blood_pressure');
  const hasDiastolic = measurementCodes.includes('diastolic_blood_pressure');
  if (hasSystolic && hasDiastolic) {
    const systolic = measurements.find(item => item.code === 'systolic_blood_pressure').value;
    const diastolic = measurements.find(item => item.code === 'diastolic_blood_pressure');
    if (systolic <= diastolic.value) {
      fail('Systolic pressure must be greater than diastolic pressure.', `${expression}.measurements`, 'value');
    }
  }

  const rawSymptoms = raw.symptoms || [];
  if (!Array.isArray(rawSymptoms) || rawSymptoms.length > 12) {
    fail('symptoms must be an array with at most 12 entries.', `${expression}.symptoms`, 'structure');
  }
  const symptoms = rawSymptoms.map((symptom, symptomIndex) =>
    validateSymptom(
      symptom,
      `${expression}.symptoms[${symptomIndex}]`,
      nowMs,
      producedAt.timestampMs
    )
  );
  const symptomKeys = symptoms.map(symptom => `${symptom.code}:${symptom.onset_at}`);
  if (new Set(symptomKeys).size !== symptomKeys.length) {
    fail('Symptoms cannot be repeated at the same onset.', `${expression}.symptoms`, 'duplicate');
  }

  const event = {
    schema_version: EVENT_SCHEMA_VERSION,
    event_id: assertSafeId(raw.event_id, `${expression}.event_id`),
    event_type: 'measurement.recorded',
    correlation_id: assertSafeId(raw.correlation_id, `${expression}.correlation_id`),
    patient_ref: assertSafeId(raw.patient_ref, `${expression}.patient_ref`, PATIENT_REF),
    device_ref: assertSafeId(raw.device_ref, `${expression}.device_ref`, DEVICE_REF),
    occurred_at: occurredAt.iso,
    produced_at: producedAt.iso,
    source,
    measurements,
    synthetic: assertBoolean(raw.synthetic, `${expression}.synthetic`),
    mode: raw.mode,
    clinical_use: assertBoolean(raw.clinical_use, `${expression}.clinical_use`),
  };
  if (event.synthetic !== true) {
    fail('Step 1 accepts synthetic events only.', `${expression}.synthetic`, 'security');
  }
  if (event.mode !== 'shadow') {
    fail('Step 1 accepts shadow mode only.', `${expression}.mode`, 'security');
  }
  if (event.clinical_use !== false) {
    fail('Synthetic events cannot be marked for clinical use.', `${expression}.clinical_use`, 'security');
  }
  if (raw.activity_context) {
    event.activity_context = validateActivityContext(
      raw.activity_context,
      `${expression}.activity_context`
    );
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'symptoms')) {
    event.symptoms = symptoms;
  }
  return event;
}

function validateMeasurementBatch(raw, options = {}) {
  assertNoPiiKeys(raw);
  assertExactKeys(raw, ['schema_version', 'batch_id', 'events'], [], 'body');
  if (raw.schema_version !== BATCH_SCHEMA_VERSION) {
    fail('Unsupported batch schema version.', 'body.schema_version', 'not-supported');
  }
  assertSafeId(raw.batch_id, 'body.batch_id');
  if (!Array.isArray(raw.events) || raw.events.length < 1 || raw.events.length > MAX_BATCH_EVENTS) {
    fail(`events must contain between 1 and ${MAX_BATCH_EVENTS} entries.`, 'body.events', 'structure');
  }
  const nowMs = options.now instanceof Date ? options.now.getTime() : Date.now();
  const events = raw.events.map((event, index) => validateEvent(event, index, nowMs));
  const eventIds = events.map(event => event.event_id);
  if (new Set(eventIds).size !== eventIds.length) {
    fail('event_id cannot be repeated in one batch.', 'body.events', 'duplicate');
  }
  return {
    schema_version: BATCH_SCHEMA_VERSION,
    batch_id: raw.batch_id,
    events,
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function payloadFingerprint(value) {
  return sha256(stableStringify(value));
}

module.exports = {
  ACK_SCHEMA_VERSION,
  BATCH_SCHEMA_VERSION,
  ContractValidationError,
  EVENT_SCHEMA_VERSION,
  MAX_BATCH_EVENTS,
  MEASUREMENT_DEFINITIONS,
  SOURCE_MEASUREMENT_REQUIREMENTS,
  payloadFingerprint,
  sha256,
  validateSourceMeasurementCombination,
  validateMeasurementBatch,
};
