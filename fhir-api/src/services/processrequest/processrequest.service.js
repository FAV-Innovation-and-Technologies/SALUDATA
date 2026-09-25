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

let getProcessrequest = (base_version) => {
  return resolveSchema(base_version, 'Processrequest');
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

  // Processrequest search params
  let action = args['action'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let provider = args['provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
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

  if (provider) {
    query.provider = stringQueryBuilder(provider);
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

  // Processrequest search params for DSTU2
  let action = args['action'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let provider = args['provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
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

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Processrequest >>> search');

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
  let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${base_version}`);
  let Processrequest = getProcessrequest(base_version);

  try {
    // Query our collection for this processrequest
    const cursor = collection.find(query);
    const processrequests = await cursor.toArray();

    processrequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Processrequest(element);
    });

    return toSearchBundle(processrequests);
  } catch (err) {
    logger.error('Error with Processrequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Processrequest >>> searchById');

  let { base_version, id } = args;
  let Processrequest = getProcessrequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${base_version}`);

  try {
    // Query our collection for this processrequest
    const processrequest = await collection.findOne({ id: id.toString() });

    if (processrequest) {
      delete processrequest._id;
      return new Processrequest(processrequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Processrequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Processrequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${base_version}`);

    // Get current record
    let Processrequest = getProcessrequest(base_version);
    let processrequest = new Processrequest(resource);
    delete processrequest._id;

    // If no resource ID was provided, generate one.
    let id = processrequest.id || getUuid();
    if (!processrequest.id) {
      processrequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    processrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(processrequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Processrequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Processrequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${base_version}`);

    // Get current record
    let Processrequest = getProcessrequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Processrequest Class
    let processrequest = new Processrequest(resource);
    delete processrequest._id;
    processrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(processrequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Processrequest updated with id: ' + id);
      resolve({
        id: processrequest.id,
        created: false,
        resource_version: processrequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processrequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Processrequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processrequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Processrequest = getProcessrequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${base_version}`);

    // Query our collection for this processrequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((processrequest) => {
      if (processrequest) {
        delete processrequest._id;
        resolve(new Processrequest(processrequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processrequest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let provider = args['provider'];

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
    let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${base_version}`);
    let Processrequest = getProcessrequest(base_version);

    // Query our collection for processrequest history
    collection.find(query).toArray().then((processrequests) => {
      processrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Processrequest(element);
      });
      resolve(processrequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Processrequest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let provider = args['provider'];

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
    let collection = db.collection(`${COLLECTION.PROCESSREQUEST}_${base_version}`);
    let Processrequest = getProcessrequest(base_version);

    // Query our collection for processrequest history by id
    collection.find(query).toArray().then((processrequests) => {
      processrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Processrequest(element);
      });
      resolve(processrequests);
    }).catch(_reject);
  });
