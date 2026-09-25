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

let getEligibilityresponse = (base_version) => {
  return resolveSchema(base_version, 'Eligibilityresponse');
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

  // Eligibilityresponse search params
  let created = args['created'];
  let disposition = args['disposition'];
  let identifier = args['identifier'];
  let insurer = args['insurer'];
  let outcome = args['outcome'];
  let request = args['request'];
  let request_organization = args['request_organization'];
  let request_provider = args['request_provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (disposition) {
    query.disposition = stringQueryBuilder(disposition);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (insurer) {
    query.insurer = stringQueryBuilder(insurer);
  }

  if (outcome) {
    query.outcome = stringQueryBuilder(outcome);
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

  // Eligibilityresponse search params for DSTU2
  let created = args['created'];
  let disposition = args['disposition'];
  let identifier = args['identifier'];
  let insurer = args['insurer'];
  let outcome = args['outcome'];
  let request = args['request'];
  let request_organization = args['request_organization'];
  let request_provider = args['request_provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (disposition) {
    query.disposition = stringQueryBuilder(disposition);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (insurer) {
    query.insurer = stringQueryBuilder(insurer);
  }

  if (outcome) {
    query.outcome = stringQueryBuilder(outcome);
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
  logger.info('Eligibilityresponse >>> search');

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
  let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${base_version}`);
  let Eligibilityresponse = getEligibilityresponse(base_version);

  try {
    // Query our collection for this eligibilityresponse
    const cursor = collection.find(query);
    const eligibilityresponses = await cursor.toArray();

    eligibilityresponses.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Eligibilityresponse(element);
    });

    return toSearchBundle(eligibilityresponses);
  } catch (err) {
    logger.error('Error with Eligibilityresponse.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Eligibilityresponse >>> searchById');

  let { base_version, id } = args;
  let Eligibilityresponse = getEligibilityresponse(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${base_version}`);

  try {
    // Query our collection for this eligibilityresponse
    const eligibilityresponse = await collection.findOne({ id: id.toString() });

    if (eligibilityresponse) {
      delete eligibilityresponse._id;
      return new Eligibilityresponse(eligibilityresponse);
    }
    return null;
  } catch (err) {
    logger.error('Error with Eligibilityresponse.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityresponse >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${base_version}`);

    // Get current record
    let Eligibilityresponse = getEligibilityresponse(base_version);
    let eligibilityresponse = new Eligibilityresponse(resource);
    delete eligibilityresponse._id;

    // If no resource ID was provided, generate one.
    let id = eligibilityresponse.id || getUuid();
    if (!eligibilityresponse.id) {
      eligibilityresponse.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    eligibilityresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(eligibilityresponse));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Eligibilityresponse created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityresponse >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${base_version}`);

    // Get current record
    let Eligibilityresponse = getEligibilityresponse(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Eligibilityresponse Class
    let eligibilityresponse = new Eligibilityresponse(resource);
    delete eligibilityresponse._id;
    eligibilityresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(eligibilityresponse));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Eligibilityresponse updated with id: ' + id);
      resolve({
        id: eligibilityresponse.id,
        created: false,
        resource_version: eligibilityresponse.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityresponse >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Eligibilityresponse deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityresponse >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Eligibilityresponse = getEligibilityresponse(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${base_version}`);

    // Query our collection for this eligibilityresponse with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((eligibilityresponse) => {
      if (eligibilityresponse) {
        delete eligibilityresponse._id;
        resolve(new Eligibilityresponse(eligibilityresponse));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityresponse >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let created = args['created'];
    let disposition = args['disposition'];
    let identifier = args['identifier'];
    let insurer = args['insurer'];
    let outcome = args['outcome'];
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
    let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${base_version}`);
    let Eligibilityresponse = getEligibilityresponse(base_version);

    // Query our collection for eligibilityresponse history
    collection.find(query).toArray().then((eligibilityresponses) => {
      eligibilityresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Eligibilityresponse(element);
      });
      resolve(eligibilityresponses);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityresponse >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let created = args['created'];
    let disposition = args['disposition'];
    let identifier = args['identifier'];
    let insurer = args['insurer'];
    let outcome = args['outcome'];
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
    let collection = db.collection(`${COLLECTION.ELIGIBILITYRESPONSE}_${base_version}`);
    let Eligibilityresponse = getEligibilityresponse(base_version);

    // Query our collection for eligibilityresponse history by id
    collection.find(query).toArray().then((eligibilityresponses) => {
      eligibilityresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Eligibilityresponse(element);
      });
      resolve(eligibilityresponses);
    }).catch(_reject);
  });
