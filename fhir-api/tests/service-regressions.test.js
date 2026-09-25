'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

jest.mock('@bluehalo/node-fhir-server-core', () => ({
  constants: {
    VERSIONS: {
      '1_0_2': '1_0_2',
      '3_0_1': '3_0_1',
      '4_0_0': '4_0_0',
      '4_0_1': '4_0_1',
    },
  },
  resolveSchema: () =>
    class FhirResource {
      constructor(resource) {
        Object.assign(this, resource);
      }
    },
  loggers: {
    get: () => ({ info: jest.fn(), error: jest.fn() }),
  },
}));

const globals = require('../src/globals');
const { CLIENT_DB } = require('../src/constants');
const { toSearchBundle } = require('../src/utils/search-bundle.util');

const VERSION = '4_0_1';

function createDatabase(recordsByCollection) {
  const queries = [];
  return {
    queries,
    collection(name) {
      return {
        find(query) {
          queries.push({ name, query });
          return {
            toArray: () => Promise.resolve(recordsByCollection[name] || []),
          };
        },
      };
    },
  };
}

describe('generated resource history services', () => {
  afterEach(() => {
    globals.delete(CLIENT_DB);
  });

  test.each([
    ['VisionPrescription', 'visionprescription', 'VisionPrescription'],
    ['Patient', 'patient', 'Patient'],
    ['Observation', 'observation', 'Observation'],
    ['MedicationRequest', 'medicationrequest', 'MedicationRequest'],
  ])('%s historyById uses the requested FHIR version and resource id', async (resourceType, serviceName, collection) => {
    const database = createDatabase({
      [`${collection}_${VERSION}`]: [
        { resourceType, id: 'example-id', _id: 'internal-mongo-id' },
      ],
    });
    globals.set(CLIENT_DB, database);

    const service = require(`../src/services/${serviceName}/${serviceName}.service`);
    const resources = await service.historyById({ base_version: VERSION, id: 'example-id' });

    expect(database.queries).toEqual([
      {
        name: `${collection}_${VERSION}`,
        query: { id: 'example-id' },
      },
    ]);
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({ resourceType, id: 'example-id' });
    expect(resources[0]).not.toHaveProperty('_id');
  });

  test('Patient search removes Mongo _id before returning an array resource', async () => {
    const database = createDatabase({
      [`Patient_${VERSION}`]: [
        { resourceType: 'Patient', id: 'example-id', _id: 'internal-mongo-id' },
      ],
    });
    globals.set(CLIENT_DB, database);
    const service = require('../src/services/patient/patient.service');

    const bundle = await service.search({ base_version: VERSION });

    expect(database.queries).toEqual([{ name: `Patient_${VERSION}`, query: {} }]);
    expect(bundle).toMatchObject({ resourceType: 'Bundle', type: 'searchset', total: 1 });
    expect(bundle.entry[0].resource).toMatchObject({ resourceType: 'Patient', id: 'example-id' });
    expect(bundle.entry[0].resource).not.toHaveProperty('_id');
  });

  test('search bundle helper represents empty and nonempty result sets', () => {
    expect(toSearchBundle([])).toEqual({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
      entry: [],
    });
    expect(toSearchBundle([{ resourceType: 'Patient', id: 'example-id' }])).toEqual({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [{ resource: { resourceType: 'Patient', id: 'example-id' } }],
    });
  });

  test('VisionPrescription historyById rejects a Mongo query error', async () => {
    globals.set(CLIENT_DB, {
      collection: () => ({
        find: () => ({
          toArray: () => Promise.reject(new Error('synthetic Mongo failure')),
        }),
      }),
    });
    const service = require('../src/services/visionprescription/visionprescription.service');

    await expect(
      service.historyById({ base_version: VERSION, id: 'example-id' }),
    ).rejects.toThrow('synthetic Mongo failure');
  });

  test('VisionPrescription create persists and returns the generated FHIR id', async () => {
    const inserted = [];
    globals.set(CLIENT_DB, {
      collection: name => ({
        insertOne: document => {
          inserted.push({ name, document });
          return Promise.resolve({ acknowledged: true });
        },
      }),
    });
    const service = require('../src/services/visionprescription/visionprescription.service');

    const result = await service.create(
      { base_version: VERSION },
      { req: { body: { resourceType: 'VisionPrescription', status: 'active' } } },
    );

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(inserted).toEqual([
      {
        name: `VisionPrescription_${VERSION}`,
        document: expect.objectContaining({
          resourceType: 'VisionPrescription',
          id: result.id,
          meta: expect.objectContaining({ versionId: '1' }),
        }),
      },
    ]);
  });

  test('VisionPrescription create rejects a Mongo insert error', async () => {
    globals.set(CLIENT_DB, {
      collection: () => ({
        insertOne: () => Promise.reject(new Error('synthetic Mongo insert failure')),
      }),
    });
    const service = require('../src/services/visionprescription/visionprescription.service');

    await expect(
      service.create(
        { base_version: VERSION },
        { req: { body: { resourceType: 'VisionPrescription' } } },
      ),
    ).rejects.toThrow('synthetic Mongo insert failure');
  });

  test('Patient update removes Mongo _id from a full resource response', async () => {
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    globals.set(CLIENT_DB, {
      collection: () => ({ updateOne }),
    });
    const service = require('../src/services/patient/patient.service');

    await service.update(
      { base_version: VERSION, id: 'example-id' },
      {
        req: {
          body: {
            resourceType: 'Patient',
            id: 'example-id',
            _id: '66c31d0d0d0d0d0d0d0d0d0d',
          },
        },
      },
    );

    expect(updateOne).toHaveBeenCalledWith(
      { id: 'example-id' },
      {
        $set: expect.objectContaining({ id: 'example-id' }),
      },
    );
    expect(updateOne.mock.calls[0][1].$set).not.toHaveProperty('_id');
  });

  test('the real BlueHalo schema does not send its internal _id to Mongo inserts', () => {
    const script = `
      const globals = require('./src/globals');
      const { CLIENT_DB } = require('./src/constants');
      const service = require('./src/services/visionprescription/visionprescription.service');
      let inserted;
      globals.set(CLIENT_DB, {
        collection: () => ({
          insertOne: document => {
            inserted = document;
            return Promise.resolve({ acknowledged: true });
          },
        }),
      });
      service.create(
        { base_version: '4_0_1' },
        { req: { body: { resourceType: 'VisionPrescription' } } },
      ).then(result => {
        if (Object.prototype.hasOwnProperty.call(inserted, '_id')) {
          throw new Error('internal Mongo _id was persisted');
        }
        if (inserted.id !== result.id) {
          throw new Error('generated FHIR id was not persisted');
        }
      }).catch(error => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    expect(() =>
      execFileSync(process.execPath, ['-e', script], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  test('the real BlueHalo Patient search serializes a FHIR search Bundle', () => {
    const script = `
      const globals = require('./src/globals');
      const { CLIENT_DB } = require('./src/constants');
      const service = require('./src/services/patient/patient.service');
      globals.set(CLIENT_DB, {
        collection: () => ({
          find: () => ({
            toArray: () => Promise.resolve([
              { resourceType: 'Patient', id: 'example-id', _id: 'internal-mongo-id' },
            ]),
          }),
        }),
      });
      service.search({ base_version: '4_0_1' }).then(bundle => {
        process.stdout.write(JSON.stringify(bundle));
      }).catch(error => {
        console.error(error);
        process.exitCode = 1;
      });
    `;
    const output = execFileSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const bundle = JSON.parse(output.toString());

    expect(bundle).toMatchObject({ resourceType: 'Bundle', type: 'searchset', total: 1 });
    expect(bundle.entry[0].resource).toMatchObject({ resourceType: 'Patient', id: 'example-id' });
    expect(bundle.entry[0].resource).not.toHaveProperty('_id');
  });
});
