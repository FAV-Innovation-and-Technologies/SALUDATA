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

let getBinary = (base_version) => {
  return resolveSchema(base_version, 'Binary');
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

  // Binary search params
  let contenttype = args['contenttype'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (contenttype) {
    let queryBuilder = tokenQueryBuilder(contenttype, 'code', 'contenttype.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  // Binary search params for DSTU2
  let contenttype = args['contenttype'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (contenttype) {
    let queryBuilder = tokenQueryBuilder(contenttype, 'code', 'contenttype.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Binary >>> search');

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
  let collection = db.collection(`${COLLECTION.BINARY}_${base_version}`);
  let Binary = getBinary(base_version);

  try {
    // Query our collection for this binary
    const cursor = collection.find(query);
    const binarys = await cursor.toArray();

    binarys.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Binary(element);
    });

    return toSearchBundle(binarys);
  } catch (err) {
    logger.error('Error with Binary.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Binary >>> searchById');

  let { base_version, id } = args;
  let Binary = getBinary(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.BINARY}_${base_version}`);

  try {
    // Query our collection for this binary
    const binary = await collection.findOne({ id: id.toString() });

    if (binary) {
      delete binary._id;
      return new Binary(binary);
    }
    return null;
  } catch (err) {
    logger.error('Error with Binary.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Binary >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BINARY}_${base_version}`);

    // Get current record
    let Binary = getBinary(base_version);
    let binary = new Binary(resource);
    delete binary._id;

    // If no resource ID was provided, generate one.
    let id = binary.id || getUuid();
    if (!binary.id) {
      binary.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    binary.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(binary));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Binary created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Binary >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BINARY}_${base_version}`);

    // Get current record
    let Binary = getBinary(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Binary Class
    let binary = new Binary(resource);
    delete binary._id;
    binary.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(binary));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Binary updated with id: ' + id);
      resolve({
        id: binary.id,
        created: false,
        resource_version: binary.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Binary >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BINARY}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Binary deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Binary >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Binary = getBinary(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.BINARY}_${base_version}`);

    // Query our collection for this binary with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((binary) => {
      if (binary) {
        delete binary._id;
        resolve(new Binary(binary));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Binary >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let contenttype = args['contenttype'];

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
    let collection = db.collection(`${COLLECTION.BINARY}_${base_version}`);
    let Binary = getBinary(base_version);

    // Query our collection for binary history
    collection.find(query).toArray().then((binarys) => {
      binarys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Binary(element);
      });
      resolve(binarys);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Binary >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let contenttype = args['contenttype'];

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
    let collection = db.collection(`${COLLECTION.BINARY}_${base_version}`);
    let Binary = getBinary(base_version);

    // Query our collection for binary history by id
    collection.find(query).toArray().then((binarys) => {
      binarys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Binary(element);
      });
      resolve(binarys);
    }).catch(_reject);
  });
