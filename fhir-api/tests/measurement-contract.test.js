'use strict';

const {
  ContractValidationError,
  validateMeasurementBatch,
} = require('../src/monitoring/measurement-contract');
const {
  buildEventBundle,
  fhirIdForOpaqueReference,
  observationsFromEvent,
} = require('../src/monitoring/fhir-materializer');
const {
  DEVICE_REF,
  FIXED_NOW,
  PATIENT_REF,
  batch,
  quality,
  ringEvent,
} = require('./fixtures/measurement-fixtures');

describe('measurement-event v1 contract', () => {
  test('accepts and normalizes a canonical synthetic shadow event', () => {
    const normalized = validateMeasurementBatch(batch(), { now: FIXED_NOW });
    expect(normalized.events).toHaveLength(1);
    expect(normalized.events[0]).toMatchObject({
      patient_ref: PATIENT_REF,
      device_ref: DEVICE_REF,
      synthetic: true,
      mode: 'shadow',
      clinical_use: false,
    });
    expect(normalized.events[0].occurred_at).toBe('2026-08-12T07:30:00.000Z');
  });

  test.each([
    [
      'direct patient id',
      { patient_id: 'real-patient' },
      'body.events[0].patient_id',
    ],
    ['free symptom text', { text: 'I feel unwell' }, 'body.events[0].text'],
  ])(
    'rejects %s before persistence',
    (_name, forbidden, expectedExpression) => {
      const event = Object.assign(ringEvent(), forbidden);
      expect(() =>
        validateMeasurementBatch(batch(event), { now: FIXED_NOW }),
      ).toThrow(ContractValidationError);
      try {
        validateMeasurementBatch(batch(event), { now: FIXED_NOW });
      } catch (error) {
        expect(error.expression).toContain(expectedExpression);
        expect(error.operationOutcomeCode).toBe('security');
      }
    },
  );

  test('requires exact opaque reference formats', () => {
    const event = ringEvent({ patient_ref: 'pt_human-readable' });
    expect(() =>
      validateMeasurementBatch(batch(event), { now: FIXED_NOW }),
    ).toThrow(/opaque identifier/);
  });

  test('rejects a non-UCUM unit and unknown quality artifacts', () => {
    const wrongUnit = ringEvent();
    wrongUnit.measurements[0].unit = 'bpm';
    expect(() =>
      validateMeasurementBatch(batch(wrongUnit), { now: FIXED_NOW }),
    ).toThrow(/UCUM unit beats\/min/);

    const wrongArtifact = ringEvent();
    wrongArtifact.measurements[0].quality.artifact_codes = ['patient_name'];
    expect(() =>
      validateMeasurementBatch(batch(wrongArtifact), { now: FIXED_NOW }),
    ).toThrow(/Unsupported artifact code/);
  });

  test('enforces canonical oxygen-saturation and accelerometer bounds', () => {
    const impossibleSpo2 = ringEvent();
    impossibleSpo2.measurements[1].value = 101;
    expect(() =>
      validateMeasurementBatch(batch(impossibleSpo2), { now: FIXED_NOW }),
    ).toThrow(/between 50 and 100/);

    const highAcceleration = ringEvent();
    highAcceleration.measurements[2].value = 150;
    expect(
      validateMeasurementBatch(batch(highAcceleration), { now: FIXED_NOW })
        .events[0].measurements[2].value,
    ).toBe(150);
  });

  test('requires UTC timestamps and causal production time', () => {
    expect(() =>
      validateMeasurementBatch(
        batch(ringEvent({ occurred_at: '2026-08-12T09:30:00+02:00' })),
        { now: FIXED_NOW },
      ),
    ).toThrow(/ending in Z/);

    expect(() =>
      validateMeasurementBatch(
        batch(ringEvent({ produced_at: '2026-08-12T07:29:59Z' })),
        { now: FIXED_NOW },
      ),
    ).toThrow(/cannot precede/);
  });

  test('checks blood pressure semantics', () => {
    const event = ringEvent({
      event_id: 'evt_bp_0000000001',
      source: {
        kind: 'blood_pressure_monitor',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_BP',
      },
      measurements: [
        {
          code: 'systolic_blood_pressure',
          value: 80,
          unit: 'mm[Hg]',
          quality: quality(),
        },
        {
          code: 'diastolic_blood_pressure',
          value: 90,
          unit: 'mm[Hg]',
          quality: quality(),
        },
      ],
    });
    expect(() =>
      validateMeasurementBatch(batch(event), { now: FIXED_NOW }),
    ).toThrow(/Systolic pressure/);
  });

  test.each([
    [
      'blood-pressure monitor without diastolic pressure',
      {
        kind: 'blood_pressure_monitor',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_BP',
      },
      [
        {
          code: 'systolic_blood_pressure',
          value: 145,
          unit: 'mm[Hg]',
          quality: quality(),
        },
      ],
      /requires systolic and diastolic/,
    ],
    [
      'blood-pressure monitor without systolic pressure',
      {
        kind: 'blood_pressure_monitor',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_BP',
      },
      [
        {
          code: 'diastolic_blood_pressure',
          value: 91,
          unit: 'mm[Hg]',
          quality: quality(),
        },
      ],
      /requires systolic and diastolic/,
    ],
    [
      'smart scale without body weight',
      {
        kind: 'smart_scale',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_SCALE',
      },
      [
        {
          code: 'heart_rate',
          value: 72,
          unit: 'beats/min',
          quality: quality(),
        },
      ],
      /requires body_weight/,
    ],
  ])(
    'rejects consumer-incompatible source combination: %s',
    (_name, source, measurements, message) => {
      const event = ringEvent({
        event_id: 'evt_source_parity_01',
        source,
        measurements,
      });
      expect(() =>
        validateMeasurementBatch(batch(event), { now: FIXED_NOW }),
      ).toThrow(message);
      try {
        validateMeasurementBatch(batch(event), { now: FIXED_NOW });
      } catch (error) {
        expect(error.operationOutcomeCode).toBe('required');
        expect(error.expression).toEqual(['body.events[0].measurements']);
      }
    },
  );

  test('does not narrow valid v1 source combinations beyond consumer requirements', () => {
    const cuffWithPulse = ringEvent({
      event_id: 'evt_cuff_with_pulse_01',
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
          quality: quality(),
        },
        {
          code: 'diastolic_blood_pressure',
          value: 91,
          unit: 'mm[Hg]',
          quality: quality(),
        },
        {
          code: 'heart_rate',
          value: 76,
          unit: 'beats/min',
          quality: quality(),
        },
      ],
    });
    expect(
      validateMeasurementBatch(batch(cuffWithPulse), { now: FIXED_NOW })
        .events[0].measurements,
    ).toHaveLength(3);
  });
});

describe('FHIR R4 materialization', () => {
  test('maps opaque references to deterministic, collision-free FHIR ids', () => {
    const fhirIdPattern = /^[A-Za-z0-9.-]{1,64}$/;
    const patientIds = Array.from({ length: 256 }, (_value, index) =>
      fhirIdForOpaqueReference(
        'Patient',
        `pt_${index.toString(16).padStart(32, '0')}`,
      ),
    );
    const deviceIds = Array.from({ length: 256 }, (_value, index) =>
      fhirIdForOpaqueReference(
        'Device',
        `dev_${index.toString(16).padStart(32, '0')}`,
      ),
    );

    expect(patientIds.every((id) => fhirIdPattern.test(id))).toBe(true);
    expect(deviceIds.every((id) => fhirIdPattern.test(id))).toBe(true);
    expect(new Set(patientIds)).toHaveProperty('size', patientIds.length);
    expect(new Set(deviceIds)).toHaveProperty('size', deviceIds.length);
    expect(fhirIdForOpaqueReference('Patient', PATIENT_REF)).toBe(
      fhirIdForOpaqueReference('Patient', PATIENT_REF),
    );
    expect(fhirIdForOpaqueReference('Patient', PATIENT_REF)).not.toBe(
      fhirIdForOpaqueReference('Device', DEVICE_REF),
    );
    expect(() => fhirIdForOpaqueReference('Patient', 'pt-not-valid')).toThrow(
      /Invalid opaque Patient reference/,
    );
  });

  test('maps a blood-pressure pair into one component Observation', () => {
    const event = ringEvent({
      event_id: 'evt_bp_0000000002',
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
          quality: quality(),
        },
        {
          code: 'diastolic_blood_pressure',
          value: 91,
          unit: 'mm[Hg]',
          quality: quality(),
        },
      ],
      activity_context: undefined,
      symptoms: [],
    });
    delete event.activity_context;
    const normalized = validateMeasurementBatch(batch(event), {
      now: FIXED_NOW,
    }).events[0];
    const observations = observationsFromEvent(normalized);
    expect(observations).toHaveLength(1);
    expect(observations[0].code.coding[0].code).toBe('85354-9');
    expect(
      observations[0].component.map(
        (component) => component.code.coding[0].code,
      ),
    ).toEqual(['8480-6', '8462-4']);
    expect(observations[0].subject).toEqual({
      reference: `Patient/pt-${'a'.repeat(32)}`,
      identifier: {
        system: 'https://saludata.eu/fhir/identifier/patient-ref',
        value: PATIENT_REF,
      },
    });
    expect(observations[0].device).toEqual({
      reference: `Device/dev-${'b'.repeat(32)}`,
      identifier: {
        system: 'https://saludata.eu/fhir/identifier/device-ref',
        value: DEVICE_REF,
      },
    });
  });

  test('uses canonical UCUM codes while preserving human-readable units', () => {
    const normalized = validateMeasurementBatch(batch(), { now: FIXED_NOW })
      .events[0];
    const heartRate = observationsFromEvent(normalized).find(
      (observation) => observation.code.coding[0].code === '8867-4',
    );
    expect(heartRate.valueQuantity).toMatchObject({
      unit: 'beats/min',
      system: 'http://unitsofmeasure.org',
      code: '/min',
    });

    const steps = ringEvent({
      event_id: 'evt_steps_00000001',
      measurements: [
        { code: 'step_count', value: 1234, unit: 'count', quality: quality() },
      ],
    });
    const stepEvent = validateMeasurementBatch(batch(steps), { now: FIXED_NOW })
      .events[0];
    expect(observationsFromEvent(stepEvent)[0].valueQuantity).toMatchObject({
      unit: 'count',
      system: 'http://unitsofmeasure.org',
      code: '1',
    });
  });

  test('creates a deterministic transaction Bundle without identity data', () => {
    const normalized = validateMeasurementBatch(batch(), { now: FIXED_NOW })
      .events[0];
    const first = buildEventBundle(normalized);
    const second = buildEventBundle(normalized);
    expect(first).toEqual(second);
    expect(first.resourceType).toBe('Bundle');
    expect(first.type).toBe('transaction');
    expect(first.entry.every((entry) => entry.request.method === 'PUT')).toBe(
      true,
    );
    expect(JSON.stringify(first)).not.toMatch(
      /email|patient_id|device_id|name/i,
    );
    expect(first.meta.security).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          system: 'https://saludata.eu/fhir/CodeSystem/data-origin',
          code: 'synthetic',
        }),
        expect.objectContaining({
          system: 'https://saludata.eu/fhir/CodeSystem/processing-mode',
          code: 'shadow',
        }),
        expect.objectContaining({
          system: 'https://saludata.eu/fhir/CodeSystem/clinical-use',
          code: 'false',
        }),
      ]),
    );
    for (const entry of first.entry) {
      expect(entry.resource.meta.security).toEqual(first.meta.security);
    }
  });

  test('maps smart-scale weight and coded mobile symptoms without free text', () => {
    const scale = ringEvent({
      event_id: 'evt_scale_0000001',
      source: {
        kind: 'smart_scale',
        transport: 'bluetooth_le',
        manufacturer_code: 'SYNTH_SCALE',
      },
      measurements: [
        { code: 'body_weight', value: 74.2, unit: 'kg', quality: quality() },
      ],
      symptoms: [],
    });
    delete scale.activity_context;
    const scaleEvent = validateMeasurementBatch(batch(scale), {
      now: FIXED_NOW,
    }).events[0];
    expect(observationsFromEvent(scaleEvent)[0]).toMatchObject({
      code: { coding: [{ system: 'http://loinc.org', code: '29463-7' }] },
      valueQuantity: { value: 74.2, code: 'kg' },
    });

    const symptom = ringEvent({
      event_id: 'evt_symptom_000001',
      source: {
        kind: 'mobile_app',
        transport: 'manual',
        manufacturer_code: 'SALUDATA_APP',
      },
      measurements: [
        {
          code: 'heart_rate',
          value: 76,
          unit: 'beats/min',
          quality: quality(),
        },
      ],
      symptoms: [
        {
          code: 'dyspnea',
          severity: 'moderate',
          onset_at: '2026-08-12T07:25:00Z',
        },
      ],
    });
    delete symptom.activity_context;
    const symptomEvent = validateMeasurementBatch(batch(symptom), {
      now: FIXED_NOW,
    }).events[0];
    const symptomObservation = observationsFromEvent(symptomEvent).find(
      (observation) =>
        observation.code.coding[0].system === 'http://snomed.info/sct',
    );
    expect(symptomObservation).toMatchObject({
      code: { coding: [{ code: '267036007', display: 'Dyspnea' }] },
      valueCodeableConcept: { coding: [{ code: 'moderate' }] },
    });
    expect(symptomObservation.note).toBeUndefined();
    expect(symptomObservation.valueString).toBeUndefined();
  });
});
