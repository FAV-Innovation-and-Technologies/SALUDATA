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

let getPaymentreconciliation = (base_version) => {
  return resolveSchema(base_version, 'Paymentreconciliation');
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

  // Paymentreconciliation search params
  let created = args['created'];
  let disposition = args['disposition'];
  let identifier = args['identifier'];
  let organization = args['organization'];
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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  // Paymentreconciliation search params for DSTU2
  let created = args['created'];
  let disposition = args['disposition'];
  let identifier = args['identifier'];
  let organization = args['organization'];
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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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
  logger.info('Paymentreconciliation >>> search');

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
  let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${base_version}`);
  let Paymentreconciliation = getPaymentreconciliation(base_version);

  try {
    // Query our collection for this paymentreconciliation
    const cursor = collection.find(query);
    const paymentreconciliations = await cursor.toArray();

    paymentreconciliations.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Paymentreconciliation(element);
    });

    return toSearchBundle(paymentreconciliations);
  } catch (err) {
    logger.error('Error with Paymentreconciliation.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Paymentreconciliation >>> searchById');

  let { base_version, id } = args;
  let Paymentreconciliation = getPaymentreconciliation(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${base_version}`);

  try {
    // Query our collection for this paymentreconciliation
    const paymentreconciliation = await collection.findOne({ id: id.toString() });

    if (paymentreconciliation) {
      delete paymentreconciliation._id;
      return new Paymentreconciliation(paymentreconciliation);
    }
    return null;
  } catch (err) {
    logger.error('Error with Paymentreconciliation.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentreconciliation >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${base_version}`);

    // Get current record
    let Paymentreconciliation = getPaymentreconciliation(base_version);
    let paymentreconciliation = new Paymentreconciliation(resource);
    delete paymentreconciliation._id;

    // If no resource ID was provided, generate one.
    let id = paymentreconciliation.id || getUuid();
    if (!paymentreconciliation.id) {
      paymentreconciliation.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    paymentreconciliation.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(paymentreconciliation));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Paymentreconciliation created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentreconciliation >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${base_version}`);

    // Get current record
    let Paymentreconciliation = getPaymentreconciliation(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Paymentreconciliation Class
    let paymentreconciliation = new Paymentreconciliation(resource);
    delete paymentreconciliation._id;
    paymentreconciliation.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(paymentreconciliation));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Paymentreconciliation updated with id: ' + id);
      resolve({
        id: paymentreconciliation.id,
        created: false,
        resource_version: paymentreconciliation.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentreconciliation >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Paymentreconciliation deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentreconciliation >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Paymentreconciliation = getPaymentreconciliation(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${base_version}`);

    // Query our collection for this paymentreconciliation with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((paymentreconciliation) => {
      if (paymentreconciliation) {
        delete paymentreconciliation._id;
        resolve(new Paymentreconciliation(paymentreconciliation));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentreconciliation >>> history');

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
    let organization = args['organization'];
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
    let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${base_version}`);
    let Paymentreconciliation = getPaymentreconciliation(base_version);

    // Query our collection for paymentreconciliation history
    collection.find(query).toArray().then((paymentreconciliations) => {
      paymentreconciliations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Paymentreconciliation(element);
      });
      resolve(paymentreconciliations);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentreconciliation >>> historyById');

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
    let organization = args['organization'];
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
    let collection = db.collection(`${COLLECTION.PAYMENTRECONCILIATION}_${base_version}`);
    let Paymentreconciliation = getPaymentreconciliation(base_version);

    // Query our collection for paymentreconciliation history by id
    collection.find(query).toArray().then((paymentreconciliations) => {
      paymentreconciliations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Paymentreconciliation(element);
      });
      resolve(paymentreconciliations);
    }).catch(_reject);
  });
