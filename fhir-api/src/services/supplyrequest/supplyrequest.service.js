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

let getSupplyrequest = (base_version) => {
  return resolveSchema(base_version, 'Supplyrequest');
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

  // Supplyrequest search params
  let category = args['category'];
  let date = args['date'];
  let identifier = args['identifier'];
  let requester = args['requester'];
  let status = args['status'];
  let supplier = args['supplier'];

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

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
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

  // Supplyrequest search params for DSTU2
  let category = args['category'];
  let date = args['date'];
  let identifier = args['identifier'];
  let requester = args['requester'];
  let status = args['status'];
  let supplier = args['supplier'];

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

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
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
  logger.info('Supplyrequest >>> search');

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
  let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${base_version}`);
  let Supplyrequest = getSupplyrequest(base_version);

  try {
    // Query our collection for this supplyrequest
    const cursor = collection.find(query);
    const supplyrequests = await cursor.toArray();

    supplyrequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Supplyrequest(element);
    });

    return toSearchBundle(supplyrequests);
  } catch (err) {
    logger.error('Error with Supplyrequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Supplyrequest >>> searchById');

  let { base_version, id } = args;
  let Supplyrequest = getSupplyrequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${base_version}`);

  try {
    // Query our collection for this supplyrequest
    const supplyrequest = await collection.findOne({ id: id.toString() });

    if (supplyrequest) {
      delete supplyrequest._id;
      return new Supplyrequest(supplyrequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Supplyrequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplyrequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${base_version}`);

    // Get current record
    let Supplyrequest = getSupplyrequest(base_version);
    let supplyrequest = new Supplyrequest(resource);
    delete supplyrequest._id;

    // If no resource ID was provided, generate one.
    let id = supplyrequest.id || getUuid();
    if (!supplyrequest.id) {
      supplyrequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    supplyrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(supplyrequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Supplyrequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplyrequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${base_version}`);

    // Get current record
    let Supplyrequest = getSupplyrequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Supplyrequest Class
    let supplyrequest = new Supplyrequest(resource);
    delete supplyrequest._id;
    supplyrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(supplyrequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Supplyrequest updated with id: ' + id);
      resolve({
        id: supplyrequest.id,
        created: false,
        resource_version: supplyrequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplyrequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Supplyrequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplyrequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Supplyrequest = getSupplyrequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${base_version}`);

    // Query our collection for this supplyrequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((supplyrequest) => {
      if (supplyrequest) {
        delete supplyrequest._id;
        resolve(new Supplyrequest(supplyrequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplyrequest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let date = args['date'];
    let identifier = args['identifier'];
    let requester = args['requester'];
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
    let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${base_version}`);
    let Supplyrequest = getSupplyrequest(base_version);

    // Query our collection for supplyrequest history
    collection.find(query).toArray().then((supplyrequests) => {
      supplyrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Supplyrequest(element);
      });
      resolve(supplyrequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Supplyrequest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let date = args['date'];
    let identifier = args['identifier'];
    let requester = args['requester'];
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
    let collection = db.collection(`${COLLECTION.SUPPLYREQUEST}_${base_version}`);
    let Supplyrequest = getSupplyrequest(base_version);

    // Query our collection for supplyrequest history by id
    collection.find(query).toArray().then((supplyrequests) => {
      supplyrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Supplyrequest(element);
      });
      resolve(supplyrequests);
    }).catch(_reject);
  });
