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

let getDevicemetric = (base_version) => {
  return resolveSchema(base_version, 'Devicemetric');
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

  // Devicemetric search params
  let category = args['category'];
  let identifier = args['identifier'];
  let parent = args['parent'];
  let source = args['source'];
  let type = args['type'];

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

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (parent) {
    query.parent = stringQueryBuilder(parent);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
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

  // Devicemetric search params for DSTU2
  let category = args['category'];
  let identifier = args['identifier'];
  let parent = args['parent'];
  let source = args['source'];
  let type = args['type'];

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

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (parent) {
    query.parent = stringQueryBuilder(parent);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
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
  logger.info('Devicemetric >>> search');

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
  let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${base_version}`);
  let Devicemetric = getDevicemetric(base_version);

  try {
    // Query our collection for this devicemetric
    const cursor = collection.find(query);
    const devicemetrics = await cursor.toArray();

    devicemetrics.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Devicemetric(element);
    });

    return toSearchBundle(devicemetrics);
  } catch (err) {
    logger.error('Error with Devicemetric.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Devicemetric >>> searchById');

  let { base_version, id } = args;
  let Devicemetric = getDevicemetric(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${base_version}`);

  try {
    // Query our collection for this devicemetric
    const devicemetric = await collection.findOne({ id: id.toString() });

    if (devicemetric) {
      delete devicemetric._id;
      return new Devicemetric(devicemetric);
    }
    return null;
  } catch (err) {
    logger.error('Error with Devicemetric.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicemetric >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${base_version}`);

    // Get current record
    let Devicemetric = getDevicemetric(base_version);
    let devicemetric = new Devicemetric(resource);
    delete devicemetric._id;

    // If no resource ID was provided, generate one.
    let id = devicemetric.id || getUuid();
    if (!devicemetric.id) {
      devicemetric.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    devicemetric.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(devicemetric));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Devicemetric created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicemetric >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${base_version}`);

    // Get current record
    let Devicemetric = getDevicemetric(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Devicemetric Class
    let devicemetric = new Devicemetric(resource);
    delete devicemetric._id;
    devicemetric.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(devicemetric));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Devicemetric updated with id: ' + id);
      resolve({
        id: devicemetric.id,
        created: false,
        resource_version: devicemetric.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicemetric >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Devicemetric deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicemetric >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Devicemetric = getDevicemetric(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${base_version}`);

    // Query our collection for this devicemetric with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((devicemetric) => {
      if (devicemetric) {
        delete devicemetric._id;
        resolve(new Devicemetric(devicemetric));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicemetric >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let identifier = args['identifier'];
    let parent = args['parent'];
    let source = args['source'];
    let type = args['type'];

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
    let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${base_version}`);
    let Devicemetric = getDevicemetric(base_version);

    // Query our collection for devicemetric history
    collection.find(query).toArray().then((devicemetrics) => {
      devicemetrics.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Devicemetric(element);
      });
      resolve(devicemetrics);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicemetric >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let identifier = args['identifier'];
    let parent = args['parent'];
    let source = args['source'];
    let type = args['type'];

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
    let collection = db.collection(`${COLLECTION.DEVICEMETRIC}_${base_version}`);
    let Devicemetric = getDevicemetric(base_version);

    // Query our collection for devicemetric history by id
    collection.find(query).toArray().then((devicemetrics) => {
      devicemetrics.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Devicemetric(element);
      });
      resolve(devicemetrics);
    }).catch(_reject);
  });
