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

let getPaymentnotice = (base_version) => {
  return resolveSchema(base_version, 'Paymentnotice');
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

  // Paymentnotice search params
  let created = args['created'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let payment_status = args['payment_status'];
  let provider = args['provider'];
  let request = args['request'];
  let response = args['response'];
  let statusdate = args['statusdate'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (created) {
    query.created = stringQueryBuilder(created);
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

  if (payment_status) {
    let queryBuilder = tokenQueryBuilder(payment_status, 'code', 'payment_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (request) {
    query.request = stringQueryBuilder(request);
  }

  if (response) {
    query.response = stringQueryBuilder(response);
  }

  if (statusdate) {
    let queryBuilder = tokenQueryBuilder(statusdate, 'code', 'statusdate.coding');
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

  // Paymentnotice search params for DSTU2
  let created = args['created'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let payment_status = args['payment_status'];
  let provider = args['provider'];
  let request = args['request'];
  let response = args['response'];
  let statusdate = args['statusdate'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (created) {
    query.created = stringQueryBuilder(created);
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

  if (payment_status) {
    let queryBuilder = tokenQueryBuilder(payment_status, 'code', 'payment_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (request) {
    query.request = stringQueryBuilder(request);
  }

  if (response) {
    query.response = stringQueryBuilder(response);
  }

  if (statusdate) {
    let queryBuilder = tokenQueryBuilder(statusdate, 'code', 'statusdate.coding');
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
  logger.info('Paymentnotice >>> search');

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
  let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${base_version}`);
  let Paymentnotice = getPaymentnotice(base_version);

  try {
    // Query our collection for this paymentnotice
    const cursor = collection.find(query);
    const paymentnotices = await cursor.toArray();

    paymentnotices.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Paymentnotice(element);
    });

    return toSearchBundle(paymentnotices);
  } catch (err) {
    logger.error('Error with Paymentnotice.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Paymentnotice >>> searchById');

  let { base_version, id } = args;
  let Paymentnotice = getPaymentnotice(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${base_version}`);

  try {
    // Query our collection for this paymentnotice
    const paymentnotice = await collection.findOne({ id: id.toString() });

    if (paymentnotice) {
      delete paymentnotice._id;
      return new Paymentnotice(paymentnotice);
    }
    return null;
  } catch (err) {
    logger.error('Error with Paymentnotice.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentnotice >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${base_version}`);

    // Get current record
    let Paymentnotice = getPaymentnotice(base_version);
    let paymentnotice = new Paymentnotice(resource);
    delete paymentnotice._id;

    // If no resource ID was provided, generate one.
    let id = paymentnotice.id || getUuid();
    if (!paymentnotice.id) {
      paymentnotice.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    paymentnotice.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(paymentnotice));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Paymentnotice created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentnotice >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${base_version}`);

    // Get current record
    let Paymentnotice = getPaymentnotice(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Paymentnotice Class
    let paymentnotice = new Paymentnotice(resource);
    delete paymentnotice._id;
    paymentnotice.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(paymentnotice));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Paymentnotice updated with id: ' + id);
      resolve({
        id: paymentnotice.id,
        created: false,
        resource_version: paymentnotice.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentnotice >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Paymentnotice deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentnotice >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Paymentnotice = getPaymentnotice(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${base_version}`);

    // Query our collection for this paymentnotice with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((paymentnotice) => {
      if (paymentnotice) {
        delete paymentnotice._id;
        resolve(new Paymentnotice(paymentnotice));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentnotice >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let created = args['created'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let payment_status = args['payment_status'];
    let provider = args['provider'];
    let request = args['request'];
    let response = args['response'];
    let statusdate = args['statusdate'];

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
    let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${base_version}`);
    let Paymentnotice = getPaymentnotice(base_version);

    // Query our collection for paymentnotice history
    collection.find(query).toArray().then((paymentnotices) => {
      paymentnotices.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Paymentnotice(element);
      });
      resolve(paymentnotices);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Paymentnotice >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let created = args['created'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let payment_status = args['payment_status'];
    let provider = args['provider'];
    let request = args['request'];
    let response = args['response'];
    let statusdate = args['statusdate'];

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
    let collection = db.collection(`${COLLECTION.PAYMENTNOTICE}_${base_version}`);
    let Paymentnotice = getPaymentnotice(base_version);

    // Query our collection for paymentnotice history by id
    collection.find(query).toArray().then((paymentnotices) => {
      paymentnotices.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Paymentnotice(element);
      });
      resolve(paymentnotices);
    }).catch(_reject);
  });
