/*eslint no-unused-vars: "warn"*/

const { VERSIONS } = require('@bluehalo/node-fhir-server-core').constants;
const { resolveSchema } = require('@bluehalo/node-fhir-server-core');
const { COLLECTION, CLIENT_DB } = require('../../constants');
const moment = require('moment-timezone');
const globals = require('../../globals');

const { handleError } = require('../../lib/mongo');
const { getUuid } = require('../../utils/uid.util');
const { toSearchBundle } = require('../../utils/search-bundle.util');
const logger = require('@bluehalo/node-fhir-server-core').loggers.get();

const {
  stringQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  dateQueryBuilder,
  quantityQueryBuilder,
} = require('../../utils/querybuilder.util');

let getVisionprescription = (base_version) => {
  return resolveSchema(base_version, 'Visionprescription');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};

let buildStu3SearchQuery = (args) => {
  // Common search params
  let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } = args;

  // Search Result params
  let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
    args;

  // Visionprescription search params
  let datewritten = args['datewritten'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let prescriber = args['prescriber'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (datewritten) {
    let queryBuilder = dateQueryBuilder(datewritten, 'date', 'datewritten');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (prescriber) {
    query.prescriber = stringQueryBuilder(prescriber);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

let buildDstu2SearchQuery = (args) => {
  // Common search params
  let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } = args;

  // Search Result params
  let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
    args;

  // Visionprescription search params for DSTU2
  let datewritten = args['datewritten'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let prescriber = args['prescriber'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (datewritten) {
    let queryBuilder = dateQueryBuilder(datewritten, 'date', 'datewritten');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (prescriber) {
    query.prescriber = stringQueryBuilder(prescriber);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Visionprescription >>> search');

  let { base_version } = args;
  let query = {};

  switch (base_version) {
    case VERSIONS['1_0_2']:
      query = buildDstu2SearchQuery(args);
      break;
    case VERSIONS['3_0_1']:
    case VERSIONS['4_0_0']:
    case VERSIONS['4_0_1']:
      query = buildStu3SearchQuery(args);
      break;
  }

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${base_version}`);
  let Visionprescription = getVisionprescription(base_version);

  try {
    // Query our collection for this visionprescription
    const cursor = collection.find(query);
    const visionprescriptions = await cursor.toArray();

    visionprescriptions.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Visionprescription(element);
    });

    return toSearchBundle(visionprescriptions);
  } catch (err) {
    logger.error('Error with Visionprescription.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Visionprescription >>> searchById');

  let { base_version, id } = args;
  let Visionprescription = getVisionprescription(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${base_version}`);

  try {
    // Query our collection for this visionprescription
    const visionprescription = await collection.findOne({ id: id.toString() });

    if (visionprescription) {
      delete visionprescription._id;
      return new Visionprescription(visionprescription);
    }
    return null;
  } catch (err) {
    logger.error('Error with Visionprescription.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Visionprescription >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${base_version}`);

    // Get current record
    let Visionprescription = getVisionprescription(base_version);
    let visionprescription = new Visionprescription(resource);
    delete visionprescription._id;

    // If no resource ID was provided, generate one.
    let id = visionprescription.id || getUuid();
    if (!visionprescription.id) {
      visionprescription.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    visionprescription.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(visionprescription));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Visionprescription created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Visionprescription >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${base_version}`);

    // Get current record
    let Visionprescription = getVisionprescription(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Visionprescription Class
    let visionprescription = new Visionprescription(resource);
    delete visionprescription._id;
    visionprescription.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(visionprescription));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Visionprescription updated with id: ' + id);
      resolve({
        id: visionprescription.id,
        created: false,
        resource_version: visionprescription.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Visionprescription >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Visionprescription deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Visionprescription >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Visionprescription = getVisionprescription(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${base_version}`);

    // Query our collection for this visionprescription with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((visionprescription) => {
      if (visionprescription) {
        delete visionprescription._id;
        resolve(new Visionprescription(visionprescription));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Visionprescription >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let datewritten = args['datewritten'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let prescriber = args['prescriber'];

    let query = {};

    switch (base_version) {
      case VERSIONS['1_0_2']:
        query = buildDstu2SearchQuery(args);
        break;
      case VERSIONS['3_0_1']:
      case VERSIONS['4_0_0']:
      case VERSIONS['4_0_1']:
        query = buildStu3SearchQuery(args);
        break;
    }

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${base_version}`);
    let Visionprescription = getVisionprescription(base_version);

    // Query our collection for visionprescription history
    collection.find(query).toArray().then((visionprescriptions) => {
      visionprescriptions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Visionprescription(element);
      });
      resolve(visionprescriptions);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Visionprescription >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let datewritten = args['datewritten'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let prescriber = args['prescriber'];

    let query = { id: args.id.toString() };

    switch (base_version) {
      case VERSIONS['1_0_2']:
        Object.assign(query, buildDstu2SearchQuery(args));
        break;
      case VERSIONS['3_0_1']:
      case VERSIONS['4_0_0']:
      case VERSIONS['4_0_1']:
        Object.assign(query, buildStu3SearchQuery(args));
        break;
    }

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.VISIONPRESCRIPTION}_${base_version}`);
    let Visionprescription = getVisionprescription(base_version);

    // Query our collection for visionprescription history by id
    collection.find(query).toArray().then((visionprescriptions) => {
      visionprescriptions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Visionprescription(element);
      });
      resolve(visionprescriptions);
    }).catch(_reject);
  });
