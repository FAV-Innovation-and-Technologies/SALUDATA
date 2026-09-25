'use strict';

const fs = require('fs');
const path = require('path');
const { buildKafkaClientOptions } = require('../src/lib/kafka-manager');

describe('Kafka transport security', () => {
  test('allows plaintext only for a local step-1 broker', () => {
    expect(
      buildKafkaClientOptions({
        brokers: ['127.0.0.1:19092'],
        clientId: 'test-client',
        securityProtocol: 'PLAINTEXT',
      })
    ).toEqual({
      brokers: ['127.0.0.1:19092'],
      clientId: 'test-client',
    });
  });

  test('rejects remote plaintext and incomplete TLS', () => {
    expect(() =>
      buildKafkaClientOptions({
        brokers: ['broker.internal:9092'],
        clientId: 'test-client',
        securityProtocol: 'PLAINTEXT',
      })
    ).toThrow(/require TLS/);
    expect(() =>
      buildKafkaClientOptions({
        brokers: ['broker.internal:9093'],
        clientId: 'test-client',
        securityProtocol: 'SSL',
      })
    ).toThrow(/CA certificate/);
  });

  test('builds SASL SSL without logging or returning file paths', () => {
    const fakeRead = certificatePath => Buffer.from(`fixture:${certificatePath}`);
    const options = buildKafkaClientOptions(
      {
        brokers: ['broker.internal:9093'],
        clientId: 'test-client',
        securityProtocol: 'SASL_SSL',
        sslCaLocation: '/secrets/ca.pem',
        saslMechanism: 'scram-sha-512',
        saslUsername: 'service',
        saslPassword: 'secret-canary',
      },
      fakeRead
    );
    expect(options.ssl.rejectUnauthorized).toBe(true);
    expect(options.sasl).toEqual({
      mechanism: 'scram-sha-512',
      username: 'service',
      password: 'secret-canary',
    });
    expect(JSON.stringify(options.ssl)).not.toContain('/secrets/ca.pem');
  });

  test('generic Kafka middleware never logs FHIR URLs or health payloads', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
    expect(source).not.toContain('Raw body value');
    expect(source).not.toContain('Payload to publish');
    expect(source).not.toContain('Request endpoint:');
  });
});
