'use strict';

describe('dedicated Step 1 runtime configuration', () => {
  const original = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = Object.assign({}, original, {
      MONGO_URI: 'mongodb://mongo:27017/saludata_step1',
      MONGO_DB_NAME: 'saludata_step1',
    });
  });

  afterAll(() => {
    process.env = original;
  });

  test('does not load the full FHIR server configuration', () => {
    const { buildStep1KafkaConfig } = require('../src/step1-config');
    const config = buildStep1KafkaConfig({
      KAFKA_BROKERS: 'broker-a:9093, broker-b:9093',
      KAFKA_ENABLED: 'true',
      KAFKA_SECURITY_PROTOCOL: 'SASL_SSL',
    });

    expect(config.brokers).toEqual(['broker-a:9093', 'broker-b:9093']);
    expect(config.enabled).toBe(true);
    expect(require.cache[require.resolve('../src/config')]).toBeUndefined();
    expect(require.cache[require.resolve('@bluehalo/node-fhir-server-core')]).toBeUndefined();
  });
});
