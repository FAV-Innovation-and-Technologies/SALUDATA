'use strict';

const http = require('http');
const { createStep1App } = require('../src/step1-app');
const { batch } = require('./fixtures/measurement-fixtures');

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function valueAt(document, path) {
  return path
    .split('.')
    .reduce(
      (value, key) => (value === null || value === undefined ? undefined : value[key]),
      document,
    );
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some(clause => matches(document, clause));
    }
    const actual = valueAt(document, key);
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if (Object.prototype.hasOwnProperty.call(expected, '$in')) {
        return expected.$in.includes(actual);
      }
      if (Object.prototype.hasOwnProperty.call(expected, '$lte')) {
        return actual <= expected.$lte;
      }
    }
    if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();
    }
    return actual === expected;
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

class FakeCollection {
  constructor() {
    this.documents = [];
  }

  async createIndex() {
    return 'synthetic-index';
  }

  async findOne(filter) {
    return clone(this.documents.find(document => matches(document, filter)) || null);
  }

  async updateOne(filter, update, options) {
    let document = this.documents.find(item => matches(item, filter));
    let inserted = false;
    if (!document && options && options.upsert) {
      document = {};
      this.documents.push(document);
      inserted = true;
    }
    if (!document) {
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }
    applyUpdate(document, update, inserted);
    return { matchedCount: inserted ? 0 : 1, upsertedCount: inserted ? 1 : 0 };
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
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

async function withServer(callback, overrides) {
  const safeLogger = logger();
  const runtime = createStep1App(
    Object.assign(
      {
        db: new FakeDb(),
        kafkaManager: null,
        logger: safeLogger,
        mode: 'synthetic',
        publishingEnabled: false,
        outboxIntervalMs: 0,
      },
      overrides || {},
    ),
  );
  await runtime.ingestion.deps.ready;
  const server = http.createServer(runtime.app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`, safeLogger);
  } finally {
    runtime.ingestion.stop();
    await new Promise(resolve => server.close(resolve));
  }
}

describe('Step 1 dedicated ingestion application', () => {
  test.each([
    '/4_0_0/metadata',
    '/4_0_0/Observation',
    '/upload-bundle',
    '/alerts-hook',
    '/api-docs',
  ])('does not expose legacy/FHIR route %s', async path => {
    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}${path}`);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.resourceType).toBe('OperationOutcome');
    });
  });

  test('exposes only an operational health endpoint and protected batch route', async () => {
    await withServer(async baseUrl => {
      const health = await fetch(`${baseUrl}/healthz`);
      expect(health.status).toBe(200);

      const batchResponse = await fetch(`${baseUrl}/v1/measurement-batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const outcome = await batchResponse.json();
      expect(batchResponse.status).toBe(400);
      expect(outcome.resourceType).toBe('OperationOutcome');
      expect(outcome.issue[0].code).toBe('required');
    });
  });

  test('accepts a valid canonical synthetic batch without exposing FHIR routes', async () => {
    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/v1/measurement-batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'step1-route-idem-0001',
        },
        body: JSON.stringify(batch()),
      });
      const payload = await response.json();

      expect(response.status).toBe(202);
      expect(payload).toMatchObject({
        status: 'accepted',
        mode: 'shadow',
        clinical_use: false,
      });
    });
  });

  test('rejects malformed JSON without logging the raw canary body', async () => {
    await withServer(async (baseUrl, safeLogger) => {
      const response = await fetch(`${baseUrl}/v1/measurement-batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"secret":"raw-body-canary",',
      });
      expect(response.status).toBe(400);
      const logs = JSON.stringify(
        safeLogger.info.mock.calls
          .concat(safeLogger.warn.mock.calls)
          .concat(safeLogger.error.mock.calls),
      );
      expect(logs).not.toContain('raw-body-canary');
    });
  });
});
