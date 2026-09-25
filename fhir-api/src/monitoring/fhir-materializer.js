'use strict';

const crypto = require('crypto');

const UCUM_SYSTEM = 'http://unitsofmeasure.org';
const LOINC_SYSTEM = 'http://loinc.org';
const SNOMED_SYSTEM = 'http://snomed.info/sct';
const SALUDATA_SYSTEM = 'https://saludata.eu/fhir';
const EVENT_IDENTIFIER_SYSTEM = `${SALUDATA_SYSTEM}/identifier/measurement-event`;
const PATIENT_REFERENCE_IDENTIFIER_SYSTEM = `${SALUDATA_SYSTEM}/identifier/patient-ref`;
const DEVICE_REFERENCE_IDENTIFIER_SYSTEM = `${SALUDATA_SYSTEM}/identifier/device-ref`;
const QUALITY_EXTENSION = `${SALUDATA_SYSTEM}/StructureDefinition/measurement-quality`;
const ACTIVITY_EXTENSION = `${SALUDATA_SYSTEM}/StructureDefinition/activity-context`;
const FHIR_ID = /^[A-Za-z0-9.-]{1,64}$/;
const OPAQUE_REFERENCE_MAPPINGS = Object.freeze({
  Patient: Object.freeze({
    input: /^pt_([a-f0-9]{32})$/,
    fhirPrefix: 'pt-',
    identifierSystem: PATIENT_REFERENCE_IDENTIFIER_SYSTEM,
  }),
  Device: Object.freeze({
    input: /^dev_([a-f0-9]{32})$/,
    fhirPrefix: 'dev-',
    identifierSystem: DEVICE_REFERENCE_IDENTIFIER_SYSTEM,
  }),
});
const CANONICAL_UCUM_CODES = Object.freeze({
  heart_rate: '/min',
  step_count: '1',
});

const VITAL_SIGNS_CATEGORY = {
  coding: [
    {
      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
      code: 'vital-signs',
      display: 'Vital Signs',
    },
  ],
};

const ACTIVITY_CATEGORY = {
  coding: [
    {
      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
      code: 'activity',
      display: 'Activity',
    },
  ],
};

const SURVEY_CATEGORY = {
  coding: [
    {
      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
      code: 'survey',
      display: 'Survey',
    },
  ],
};

const MEASUREMENT_CODES = Object.freeze({
  heart_rate: {
    system: LOINC_SYSTEM,
    code: '8867-4',
    display: 'Heart rate',
    category: VITAL_SIGNS_CATEGORY,
  },
  oxygen_saturation: {
    system: LOINC_SYSTEM,
    code: '59408-5',
    display: 'Oxygen saturation in Arterial blood by Pulse oximetry',
    category: VITAL_SIGNS_CATEGORY,
  },
  body_weight: {
    system: LOINC_SYSTEM,
    code: '29463-7',
    display: 'Body weight',
    category: VITAL_SIGNS_CATEGORY,
  },
  systolic_blood_pressure: {
    system: LOINC_SYSTEM,
    code: '8480-6',
    display: 'Systolic blood pressure',
    category: VITAL_SIGNS_CATEGORY,
  },
  diastolic_blood_pressure: {
    system: LOINC_SYSTEM,
    code: '8462-4',
    display: 'Diastolic blood pressure',
    category: VITAL_SIGNS_CATEGORY,
  },
  accelerometer_rms: {
    system: `${SALUDATA_SYSTEM}/CodeSystem/wearable-measurements`,
    code: 'accelerometer-rms',
    display: 'Accelerometer root mean square',
    category: ACTIVITY_CATEGORY,
  },
  activity_score: {
    system: `${SALUDATA_SYSTEM}/CodeSystem/wearable-measurements`,
    code: 'activity-score',
    display: 'Activity score',
    category: ACTIVITY_CATEGORY,
  },
  step_count: {
    system: LOINC_SYSTEM,
    code: '41950-7',
    display: 'Number of steps in 24 hour Measured',
    category: ACTIVITY_CATEGORY,
  },
});

const SYMPTOM_CODES = Object.freeze({
  chest_pain: { code: '29857009', display: 'Chest pain' },
  dizziness: { code: '404640003', display: 'Dizziness' },
  dyspnea: { code: '267036007', display: 'Dyspnea' },
  edema: { code: '267038008', display: 'Edema' },
  fatigue: { code: '84229001', display: 'Fatigue' },
  headache: { code: '25064002', display: 'Headache' },
  nausea: { code: '422587007', display: 'Nausea' },
  palpitations: { code: '80313002', display: 'Palpitations' },
  syncope: { code: '271594007', display: 'Syncope' },
});

function deterministicId(prefix, value) {
  const digest = crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, 40);
  return `${prefix}-${digest}`;
}

function fhirIdForOpaqueReference(resourceType, opaqueReference) {
  const mapping = OPAQUE_REFERENCE_MAPPINGS[resourceType];
  const match =
    mapping && typeof opaqueReference === 'string'
      ? opaqueReference.match(mapping.input)
      : null;
  if (!match) {
    throw new TypeError(
      `Invalid opaque ${resourceType || 'resource'} reference.`,
    );
  }
  const id = `${mapping.fhirPrefix}${match[1]}`;
  if (!FHIR_ID.test(id)) {
    throw new TypeError(`Unable to create a valid FHIR ${resourceType} id.`);
  }
  return id;
}

function fhirReference(resourceType, opaqueReference) {
  const mapping = OPAQUE_REFERENCE_MAPPINGS[resourceType];
  return {
    reference: `${resourceType}/${fhirIdForOpaqueReference(resourceType, opaqueReference)}`,
    identifier: {
      system: mapping.identifierSystem,
      value: opaqueReference,
    },
  };
}

function securityMetadata(event) {
  return {
    versionId: '1',
    lastUpdated: event.produced_at,
    security: [
      {
        system: `${SALUDATA_SYSTEM}/CodeSystem/data-origin`,
        code: 'synthetic',
        display: 'Synthetic data',
      },
      {
        system: `${SALUDATA_SYSTEM}/CodeSystem/processing-mode`,
        code: 'shadow',
        display: 'Shadow mode - not for clinical use',
      },
      {
        system: `${SALUDATA_SYSTEM}/CodeSystem/clinical-use`,
        code: 'false',
        display: 'Not for clinical use',
      },
    ],
    tag: [
      {
        system: `${SALUDATA_SYSTEM}/CodeSystem/schema-version`,
        code: event.schema_version,
      },
    ],
  };
}

function eventIdentifier(event, suffix) {
  return [
    {
      system: EVENT_IDENTIFIER_SYSTEM,
      value: suffix ? `${event.event_id}:${suffix}` : event.event_id,
    },
  ];
}

function eventReferences(event) {
  return {
    subject: fhirReference('Patient', event.patient_ref),
    device: fhirReference('Device', event.device_ref),
  };
}

function qualityExtension(quality) {
  const nested = [
    { url: 'status', valueCode: quality.status },
    { url: 'score', valueDecimal: quality.score },
  ];
  if (quality.coverage_ratio !== undefined) {
    nested.push({
      url: 'coverage-ratio',
      valueDecimal: quality.coverage_ratio,
    });
  }
  quality.artifact_codes.forEach((code) => {
    nested.push({ url: 'artifact-code', valueCode: code });
  });
  return {
    url: QUALITY_EXTENSION,
    extension: nested,
  };
}

function codeableConcept(definition) {
  return {
    coding: [
      {
        system: definition.system,
        code: definition.code,
        display: definition.display,
      },
    ],
    text: definition.display,
  };
}

function baseObservation(event, id, code, category, effectiveDateTime) {
  const refs = eventReferences(event);
  return {
    resourceType: 'Observation',
    id,
    meta: securityMetadata(event),
    identifier: eventIdentifier(event, id),
    status: 'final',
    category: [category],
    code,
    subject: refs.subject,
    device: refs.device,
    effectiveDateTime: effectiveDateTime || event.occurred_at,
    issued: event.produced_at,
  };
}

function quantityForMeasurement(measurement) {
  return {
    value: measurement.value,
    unit: measurement.unit,
    system: UCUM_SYSTEM,
    code: CANONICAL_UCUM_CODES[measurement.code] || measurement.unit,
  };
}

function buildQuantityObservation(event, measurement) {
  const definition = MEASUREMENT_CODES[measurement.code];
  const id = deterministicId('obs', `${event.event_id}:${measurement.code}`);
  const observation = baseObservation(
    event,
    id,
    codeableConcept(definition),
    definition.category,
  );
  observation.extension = [qualityExtension(measurement.quality)];
  observation.valueQuantity = quantityForMeasurement(measurement);
  return observation;
}

function qualityRank(status) {
  return ['poor', 'unknown', 'usable', 'good'].indexOf(status);
}

function leastReliableQuality(first, second) {
  const source =
    qualityRank(first.status) <= qualityRank(second.status) ? first : second;
  const coverage = [first.coverage_ratio, second.coverage_ratio].filter(
    (value) => value !== undefined,
  );
  const quality = {
    status: source.status,
    score: Math.min(first.score, second.score),
    artifact_codes: Array.from(
      new Set(first.artifact_codes.concat(second.artifact_codes)),
    ),
  };
  if (coverage.length > 0) {
    quality.coverage_ratio = Math.min.apply(null, coverage);
  }
  return quality;
}

function buildBloodPressureObservation(event, systolic, diastolic) {
  const id = deterministicId('obs', `${event.event_id}:blood-pressure`);
  const observation = baseObservation(
    event,
    id,
    codeableConcept({
      system: LOINC_SYSTEM,
      code: '85354-9',
      display: 'Blood pressure panel with all children optional',
    }),
    VITAL_SIGNS_CATEGORY,
  );
  observation.extension = [
    qualityExtension(leastReliableQuality(systolic.quality, diastolic.quality)),
  ];
  observation.component = [
    {
      code: codeableConcept({
        system: LOINC_SYSTEM,
        code: '8480-6',
        display: 'Systolic blood pressure',
      }),
      valueQuantity: quantityForMeasurement(systolic),
    },
    {
      code: codeableConcept({
        system: LOINC_SYSTEM,
        code: '8462-4',
        display: 'Diastolic blood pressure',
      }),
      valueQuantity: quantityForMeasurement(diastolic),
    },
  ];
  return observation;
}

function buildActivityContextObservation(event) {
  if (!event.activity_context) {
    return null;
  }
  const context = event.activity_context;
  const id = deterministicId('obs', `${event.event_id}:activity-context`);
  const observation = baseObservation(
    event,
    id,
    codeableConcept({
      system: `${SALUDATA_SYSTEM}/CodeSystem/wearable-measurements`,
      code: 'activity-context',
      display: 'Activity context',
    }),
    ACTIVITY_CATEGORY,
  );
  observation.extension = [
    {
      url: ACTIVITY_EXTENSION,
      extension: [
        { url: 'confidence', valueDecimal: context.confidence },
        { url: 'origin', valueCode: context.origin },
      ],
    },
  ];
  observation.valueCodeableConcept = {
    coding: [
      {
        system: `${SALUDATA_SYSTEM}/CodeSystem/activity-state`,
        code: context.state,
      },
    ],
  };
  return observation;
}

function buildSymptomObservation(event, symptom, index) {
  const definition = SYMPTOM_CODES[symptom.code];
  const id = deterministicId(
    'obs',
    `${event.event_id}:symptom:${symptom.code}:${index}`,
  );
  const observation = baseObservation(
    event,
    id,
    codeableConcept({
      system: SNOMED_SYSTEM,
      code: definition.code,
      display: definition.display,
    }),
    SURVEY_CATEGORY,
    symptom.onset_at,
  );
  observation.valueCodeableConcept = {
    coding: [
      {
        system: `${SALUDATA_SYSTEM}/CodeSystem/symptom-severity`,
        code: symptom.severity,
      },
    ],
  };
  return observation;
}

function observationsFromEvent(event) {
  const observations = [];
  const systolic = event.measurements.find(
    (item) => item.code === 'systolic_blood_pressure',
  );
  const diastolic = event.measurements.find(
    (item) => item.code === 'diastolic_blood_pressure',
  );
  if (systolic && diastolic) {
    observations.push(
      buildBloodPressureObservation(event, systolic, diastolic),
    );
  }
  event.measurements
    .filter((measurement) => {
      if (!systolic || !diastolic) {
        return true;
      }
      return (
        measurement.code !== 'systolic_blood_pressure' &&
        measurement.code !== 'diastolic_blood_pressure'
      );
    })
    .forEach((measurement) =>
      observations.push(buildQuantityObservation(event, measurement)),
    );
  const activity = buildActivityContextObservation(event);
  if (activity) {
    observations.push(activity);
  }
  (event.symptoms || []).forEach((symptom, index) => {
    observations.push(buildSymptomObservation(event, symptom, index));
  });
  return observations;
}

function buildEventBundle(event) {
  const observations = observationsFromEvent(event);
  const bundleId = deterministicId('bundle', event.event_id);
  return {
    resourceType: 'Bundle',
    id: bundleId,
    meta: securityMetadata(event),
    identifier: {
      system: EVENT_IDENTIFIER_SYSTEM,
      value: event.event_id,
    },
    type: 'transaction',
    timestamp: event.produced_at,
    entry: observations.map((observation) => ({
      fullUrl: `urn:saludata:observation:${observation.id}`,
      resource: observation,
      request: {
        method: 'PUT',
        url: `Observation/${observation.id}`,
      },
    })),
  };
}

function cleanDocument(resource) {
  const document = JSON.parse(JSON.stringify(resource));
  delete document._id;
  return document;
}

function isDuplicateKeyError(error) {
  return Boolean(error && error.code === 11000);
}

async function upsertWithDeterministicStorageId(
  collection,
  lookup,
  storageId,
  document,
) {
  const existing = await collection.findOne(lookup, { projection: { _id: 1 } });
  const resolvedStorageId =
    existing && existing._id !== undefined ? existing._id : storageId;
  try {
    await collection.updateOne(
      { _id: resolvedStorageId },
      { $set: document },
      { upsert: true },
    );
  } catch (error) {
    // Concurrent first writes use the same deterministic Mongo _id. If both
    // observe an empty collection, one may lose the upsert race; retrying as
    // an update is safe and cannot create a second FHIR resource.
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    const winner = await collection.findOne(lookup, { projection: { _id: 1 } });
    if (!winner || winner._id === undefined) {
      throw error;
    }
    await collection.updateOne({ _id: winner._id }, { $set: document });
  }
}

async function upsertFhirResource(db, resource) {
  const document = cleanDocument(resource);
  const collectionName = `${resource.resourceType}_4_0_0`;
  const historyCollectionName = `${resource.resourceType}_4_0_0_History`;
  await upsertWithDeterministicStorageId(
    db.collection(collectionName),
    { id: resource.id },
    deterministicId('fhir', `${resource.resourceType}:${resource.id}`),
    document,
  );
  await upsertWithDeterministicStorageId(
    db.collection(historyCollectionName),
    { id: resource.id, 'meta.versionId': resource.meta.versionId },
    deterministicId(
      'fhir-history',
      `${resource.resourceType}:${resource.id}:${resource.meta.versionId}`,
    ),
    document,
  );
}

async function materializeEventBundle(db, event) {
  const bundle = buildEventBundle(event);
  for (const entry of bundle.entry) {
    await upsertFhirResource(db, entry.resource);
  }
  await upsertFhirResource(db, bundle);
  return {
    bundle_id: bundle.id,
    observation_ids: bundle.entry.map((entry) => entry.resource.id),
  };
}

module.exports = {
  buildEventBundle,
  fhirIdForOpaqueReference,
  materializeEventBundle,
  observationsFromEvent,
};
