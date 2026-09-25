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

let getClaimresponse = (base_version) => {
  return resolveSchema(base_version, 'Claimresponse');
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

  // Claimresponse search params
  let created = args['created'];
  let disposition = args['disposition'];
  let identifier = args['identifier'];
  let insurer = args['insurer'];
  let outcome = args['outcome'];
  let patient = args['patient'];
  let payment_date = args['payment_date'];
  let request = args['request'];
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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (payment_date) {
    let queryBuilder = dateQueryBuilder(payment_date, 'date', 'payment_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (request) {
    query.request = stringQueryBuilder(request);
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

  // Claimresponse search params for DSTU2
  let created = args['created'];
  let disposition = args['disposition'];
  let identifier = args['identifier'];
  let insurer = args['insurer'];
  let outcome = args['outcome'];
  let patient = args['patient'];
  let payment_date = args['payment_date'];
  let request = args['request'];
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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (payment_date) {
    let queryBuilder = dateQueryBuilder(payment_date, 'date', 'payment_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (request) {
    query.request = stringQueryBuilder(request);
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
  logger.info('Claimresponse >>> search');

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
  let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${base_version}`);
  let Claimresponse = getClaimresponse(base_version);

  try {
    // Query our collection for this claimresponse
    const cursor = collection.find(query);
    const claimresponses = await cursor.toArray();

    claimresponses.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Claimresponse(element);
    });

    return toSearchBundle(claimresponses);
  } catch (err) {
    logger.error('Error with Claimresponse.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Claimresponse >>> searchById');

  let { base_version, id } = args;
  let Claimresponse = getClaimresponse(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${base_version}`);

  try {
    // Query our collection for this claimresponse
    const claimresponse = await collection.findOne({ id: id.toString() });

    if (claimresponse) {
      delete claimresponse._id;
      return new Claimresponse(claimresponse);
    }
    return null;
  } catch (err) {
    logger.error('Error with Claimresponse.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Claimresponse >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${base_version}`);

    // Get current record
    let Claimresponse = getClaimresponse(base_version);
    let claimresponse = new Claimresponse(resource);
    delete claimresponse._id;

    // If no resource ID was provided, generate one.
    let id = claimresponse.id || getUuid();
    if (!claimresponse.id) {
      claimresponse.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    claimresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(claimresponse));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Claimresponse created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Claimresponse >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${base_version}`);

    // Get current record
    let Claimresponse = getClaimresponse(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Claimresponse Class
    let claimresponse = new Claimresponse(resource);
    delete claimresponse._id;
    claimresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(claimresponse));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Claimresponse updated with id: ' + id);
      resolve({
        id: claimresponse.id,
        created: false,
        resource_version: claimresponse.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claimresponse >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Claimresponse deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claimresponse >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Claimresponse = getClaimresponse(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${base_version}`);

    // Query our collection for this claimresponse with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((claimresponse) => {
      if (claimresponse) {
        delete claimresponse._id;
        resolve(new Claimresponse(claimresponse));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claimresponse >>> history');

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
    let patient = args['patient'];
    let payment_date = args['payment_date'];
    let request = args['request'];
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
    let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${base_version}`);
    let Claimresponse = getClaimresponse(base_version);

    // Query our collection for claimresponse history
    collection.find(query).toArray().then((claimresponses) => {
      claimresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Claimresponse(element);
      });
      resolve(claimresponses);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claimresponse >>> historyById');

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
    let patient = args['patient'];
    let payment_date = args['payment_date'];
    let request = args['request'];
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
    let collection = db.collection(`${COLLECTION.CLAIMRESPONSE}_${base_version}`);
    let Claimresponse = getClaimresponse(base_version);

    // Query our collection for claimresponse history by id
    collection.find(query).toArray().then((claimresponses) => {
      claimresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Claimresponse(element);
      });
      resolve(claimresponses);
    }).catch(_reject);
  });
