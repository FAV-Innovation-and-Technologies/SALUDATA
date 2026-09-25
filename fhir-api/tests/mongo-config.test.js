'use strict';

const {
  buildStep1MongoConfig,
  hostsFromMongoUri,
} = require('../src/monitoring/mongo-config');

describe('Step 1 MongoDB transport security', () => {
  test('keeps the explicitly local development connection available', () => {
    const result = buildStep1MongoConfig({
      MONGO_HOSTNAME: 'mongo:27017',
      MONGO_DB_NAME: 'fhir_step1',
      MONGO_USERNAME: 'user@example.test',
      MONGO_PASSWORD: 'p@ss:/word',
      MONGO_AUTH_SOURCE: 'admin',
      MONGO_TLS: 'false',
    });

    expect(result.connection).toContain(
      'user%40example.test:p%40ss%3A%2Fword@mongo:27017',
    );
    expect(result.options.tls).toBeUndefined();
  });

  test('rejects a remote target without verified TLS', () => {
    expect(() =>
      buildStep1MongoConfig({
        MONGO_URI: 'mongodb://opaque.invalid/fhir_step1',
        MONGO_DB_NAME: 'fhir_step1',
        MONGO_TLS: 'false',
      }),
    ).toThrow('Remote MongoDB requires MONGO_TLS=true.');
  });

  test('requires a CA and wires optional mTLS for a remote target', () => {
    const base = {
      MONGO_URI: 'mongodb://opaque.invalid/fhir_step1',
      MONGO_DB_NAME: 'fhir_step1',
      MONGO_TLS: 'true',
    };
    expect(() => buildStep1MongoConfig(base)).toThrow(
      'MONGO_TLS_CA_FILE is required',
    );

    const result = buildStep1MongoConfig(Object.assign({}, base, {
      MONGO_TLS_CA_FILE: '/run/secrets/mongo/ca.crt',
      MONGO_TLS_CERTIFICATE_KEY_FILE: '/run/secrets/mongo/client.pem',
    }));
    expect(result.options).toEqual({
      serverSelectionTimeoutMS: 5000,
      tls: true,
      tlsCAFile: '/run/secrets/mongo/ca.crt',
      tlsCertificateKeyFile: '/run/secrets/mongo/client.pem',
    });
  });

  test('never permits invalid certificates', () => {
    expect(() =>
      buildStep1MongoConfig({
        MONGO_URI: 'mongodb://opaque.invalid/fhir_step1',
        MONGO_DB_NAME: 'fhir_step1',
        MONGO_TLS: 'true',
        MONGO_TLS_CA_FILE: '/run/secrets/mongo/ca.crt',
        MONGO_TLS_ALLOW_INVALID_CERTIFICATES: 'true',
      }),
    ).toThrow('Invalid MongoDB certificates are never allowed.');
  });

  test('extracts every replica-set host without exposing credentials', () => {
    expect(
      hostsFromMongoUri(
        'mongodb://user:secret@mongo-a.invalid:27017,mongo-b.invalid:27017/db',
      ),
    ).toEqual(['mongo-a.invalid', 'mongo-b.invalid']);
  });
});
