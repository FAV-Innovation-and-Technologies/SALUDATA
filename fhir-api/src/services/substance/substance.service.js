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

let getSubstance = (base_version) => {
  return resolveSchema(base_version, 'Substance');
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

  // Substance search params
  let category = args['category'];
  let code = args['code'];
  let container_identifier = args['container_identifier'];
  let expiry = args['expiry'];
  let identifier = args['identifier'];
  let quantity = args['quantity'];
  let status = args['status'];
  let substance_reference = args['substance_reference'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (container_identifier) {
    let queryBuilder = tokenQueryBuilder(container_identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (expiry) {
    query.expiry = stringQueryBuilder(expiry);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (quantity) {
    query.quantity = stringQueryBuilder(quantity);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (substance_reference) {
    query.substance_reference = stringQueryBuilder(substance_reference);
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

  // Substance search params for DSTU2
  let category = args['category'];
  let code = args['code'];
  let container_identifier = args['container_identifier'];
  let expiry = args['expiry'];
  let identifier = args['identifier'];
  let quantity = args['quantity'];
  let status = args['status'];
  let substance_reference = args['substance_reference'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (container_identifier) {
    let queryBuilder = tokenQueryBuilder(container_identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (expiry) {
    query.expiry = stringQueryBuilder(expiry);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (quantity) {
    query.quantity = stringQueryBuilder(quantity);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (substance_reference) {
    query.substance_reference = stringQueryBuilder(substance_reference);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Substance >>> search');

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
  let collection = db.collection(`${COLLECTION.SUBSTANCE}_${base_version}`);
  let Substance = getSubstance(base_version);

  try {
    // Query our collection for this substance
    const cursor = collection.find(query);
    const substances = await cursor.toArray();

    substances.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Substance(element);
    });

    return toSearchBundle(substances);
  } catch (err) {
    logger.error('Error with Substance.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Substance >>> searchById');

  let { base_version, id } = args;
  let Substance = getSubstance(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.SUBSTANCE}_${base_version}`);

  try {
    // Query our collection for this substance
    const substance = await collection.findOne({ id: id.toString() });

    if (substance) {
      delete substance._id;
      return new Substance(substance);
    }
    return null;
  } catch (err) {
    logger.error('Error with Substance.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Substance >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSTANCE}_${base_version}`);

    // Get current record
    let Substance = getSubstance(base_version);
    let substance = new Substance(resource);
    delete substance._id;

    // If no resource ID was provided, generate one.
    let id = substance.id || getUuid();
    if (!substance.id) {
      substance.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    substance.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(substance));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Substance created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Substance >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSTANCE}_${base_version}`);

    // Get current record
    let Substance = getSubstance(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Substance Class
    let substance = new Substance(resource);
    delete substance._id;
    substance.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(substance));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Substance updated with id: ' + id);
      resolve({
        id: substance.id,
        created: false,
        resource_version: substance.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Substance >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSTANCE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Substance deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Substance >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Substance = getSubstance(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSTANCE}_${base_version}`);

    // Query our collection for this substance with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((substance) => {
      if (substance) {
        delete substance._id;
        resolve(new Substance(substance));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Substance >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let code = args['code'];
    let container_identifier = args['container_identifier'];
    let expiry = args['expiry'];
    let identifier = args['identifier'];
    let quantity = args['quantity'];
    let status = args['status'];
    let substance_reference = args['substance_reference'];

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
    let collection = db.collection(`${COLLECTION.SUBSTANCE}_${base_version}`);
    let Substance = getSubstance(base_version);

    // Query our collection for substance history
    collection.find(query).toArray().then((substances) => {
      substances.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Substance(element);
      });
      resolve(substances);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Substance >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let code = args['code'];
    let container_identifier = args['container_identifier'];
    let expiry = args['expiry'];
    let identifier = args['identifier'];
    let quantity = args['quantity'];
    let status = args['status'];
    let substance_reference = args['substance_reference'];

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
    let collection = db.collection(`${COLLECTION.SUBSTANCE}_${base_version}`);
    let Substance = getSubstance(base_version);

    // Query our collection for substance history by id
    collection.find(query).toArray().then((substances) => {
      substances.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Substance(element);
      });
      resolve(substances);
    }).catch(_reject);
  });
