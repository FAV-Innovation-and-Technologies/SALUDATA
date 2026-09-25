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

let getProcessresponse = (base_version) => {
  return resolveSchema(base_version, 'Processresponse');
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

  // Processresponse search params
  let identifier = args['identifier'];
  let organization = args['organization'];
  let request = args['request'];
  let request_organization = args['request_organization'];
  let request_provider = args['request_provider'];

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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (request) {
    query.request = stringQueryBuilder(request);
  }

  if (request_organization) {
    let queryBuilder = referenceQueryBuilder(request_organization, 'request_organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (request_provider) {
    query.request_provider = stringQueryBuilder(request_provider);
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

  // Processresponse search params for DSTU2
  let identifier = args['identifier'];
  let organization = args['organization'];
  let request = args['request'];
  let request_organization = args['request_organization'];
  let request_provider = args['request_provider'];

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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (request) {
    query.request = stringQueryBuilder(request);
  }

  if (request_organization) {
    let queryBuilder = referenceQueryBuilder(request_organization, 'request_organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (request_provider) {
    query.request_provider = stringQueryBuilder(request_provider);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Processresponse >>> search');

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
  let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${base_version}`);
  let Processresponse = getProcessresponse(base_version);

  try {
    // Query our collection for this processresponse
    const cursor = collection.find(query);
    const processresponses = await cursor.toArray();

    processresponses.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Processresponse(element);
    });

    return toSearchBundle(processresponses);
  } catch (err) {
    logger.error('Error with Processresponse.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Processresponse >>> searchById');

  let { base_version, id } = args;
  let Processresponse = getProcessresponse(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${base_version}`);

  try {
    // Query our collection for this processresponse
    const processresponse = await collection.findOne({ id: id.toString() });

    if (processresponse) {
      delete processresponse._id;
      return new Processresponse(processresponse);
    }
    return null;
  } catch (err) {
    logger.error('Error with Processresponse.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Processresponse >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${base_version}`);

    // Get current record
    let Processresponse = getProcessresponse(base_version);
    let processresponse = new Processresponse(resource);
    delete processresponse._id;

    // If no resource ID was provided, generate one.
    let id = processresponse.id || getUuid();
    if (!processresponse.id) {
      processresponse.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    processresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(processresponse));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Processresponse created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Processresponse >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${base_version}`);

    // Get current record
    let Processresponse = getProcessresponse(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Processresponse Class
    let processresponse = new Processresponse(resource);
    delete processresponse._id;
    processresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(processresponse));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Processresponse updated with id: ' + id);
      resolve({
        id: processresponse.id,
        created: false,
        resource_version: processresponse.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processresponse >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Processresponse deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processresponse >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Processresponse = getProcessresponse(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${base_version}`);

    // Query our collection for this processresponse with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((processresponse) => {
      if (processresponse) {
        delete processresponse._id;
        resolve(new Processresponse(processresponse));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processresponse >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let organization = args['organization'];
    let request = args['request'];
    let request_organization = args['request_organization'];
    let request_provider = args['request_provider'];

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
    let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${base_version}`);
    let Processresponse = getProcessresponse(base_version);

    // Query our collection for processresponse history
    collection.find(query).toArray().then((processresponses) => {
      processresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Processresponse(element);
      });
      resolve(processresponses);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processresponse >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let organization = args['organization'];
    let request = args['request'];
    let request_organization = args['request_organization'];
    let request_provider = args['request_provider'];

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
    let collection = db.collection(`${COLLECTION.PROCESSRESPONSE}_${base_version}`);
    let Processresponse = getProcessresponse(base_version);

    // Query our collection for processresponse history by id
    collection.find(query).toArray().then((processresponses) => {
      processresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Processresponse(element);
      });
      resolve(processresponses);
    }).catch(_reject);
  });
