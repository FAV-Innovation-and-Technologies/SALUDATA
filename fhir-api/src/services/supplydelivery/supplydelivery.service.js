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

let getSupplydelivery = (base_version) => {
  return resolveSchema(base_version, 'Supplydelivery');
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

  // Supplydelivery search params
  let identifier = args['identifier'];
  let patient = args['patient'];
  let receiver = args['receiver'];
  let status = args['status'];
  let supplier = args['supplier'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (receiver) {
    query.receiver = stringQueryBuilder(receiver);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (supplier) {
    query.supplier = stringQueryBuilder(supplier);
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

  // Supplydelivery search params for DSTU2
  let identifier = args['identifier'];
  let patient = args['patient'];
  let receiver = args['receiver'];
  let status = args['status'];
  let supplier = args['supplier'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (receiver) {
    query.receiver = stringQueryBuilder(receiver);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (supplier) {
    query.supplier = stringQueryBuilder(supplier);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Supplydelivery >>> search');

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
  let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${base_version}`);
  let Supplydelivery = getSupplydelivery(base_version);

  try {
    // Query our collection for this supplydelivery
    const cursor = collection.find(query);
    const supplydeliverys = await cursor.toArray();

    supplydeliverys.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Supplydelivery(element);
    });

    return toSearchBundle(supplydeliverys);
  } catch (err) {
    logger.error('Error with Supplydelivery.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Supplydelivery >>> searchById');

  let { base_version, id } = args;
  let Supplydelivery = getSupplydelivery(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${base_version}`);

  try {
    // Query our collection for this supplydelivery
    const supplydelivery = await collection.findOne({ id: id.toString() });

    if (supplydelivery) {
      delete supplydelivery._id;
      return new Supplydelivery(supplydelivery);
    }
    return null;
  } catch (err) {
    logger.error('Error with Supplydelivery.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplydelivery >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${base_version}`);

    // Get current record
    let Supplydelivery = getSupplydelivery(base_version);
    let supplydelivery = new Supplydelivery(resource);
    delete supplydelivery._id;

    // If no resource ID was provided, generate one.
    let id = supplydelivery.id || getUuid();
    if (!supplydelivery.id) {
      supplydelivery.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    supplydelivery.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(supplydelivery));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Supplydelivery created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplydelivery >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${base_version}`);

    // Get current record
    let Supplydelivery = getSupplydelivery(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Supplydelivery Class
    let supplydelivery = new Supplydelivery(resource);
    delete supplydelivery._id;
    supplydelivery.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(supplydelivery));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Supplydelivery updated with id: ' + id);
      resolve({
        id: supplydelivery.id,
        created: false,
        resource_version: supplydelivery.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplydelivery >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Supplydelivery deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplydelivery >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Supplydelivery = getSupplydelivery(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${base_version}`);

    // Query our collection for this supplydelivery with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((supplydelivery) => {
      if (supplydelivery) {
        delete supplydelivery._id;
        resolve(new Supplydelivery(supplydelivery));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplydelivery >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let patient = args['patient'];
    let receiver = args['receiver'];
    let status = args['status'];
    let supplier = args['supplier'];

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
    let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${base_version}`);
    let Supplydelivery = getSupplydelivery(base_version);

    // Query our collection for supplydelivery history
    collection.find(query).toArray().then((supplydeliverys) => {
      supplydeliverys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Supplydelivery(element);
      });
      resolve(supplydeliverys);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplydelivery >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let patient = args['patient'];
    let receiver = args['receiver'];
    let status = args['status'];
    let supplier = args['supplier'];

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
    let collection = db.collection(`${COLLECTION.SUPPLYDELIVERY}_${base_version}`);
    let Supplydelivery = getSupplydelivery(base_version);

    // Query our collection for supplydelivery history by id
    collection.find(query).toArray().then((supplydeliverys) => {
      supplydeliverys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Supplydelivery(element);
      });
      resolve(supplydeliverys);
    }).catch(_reject);
  });
