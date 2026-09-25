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

let getSubscription = (base_version) => {
  return resolveSchema(base_version, 'Subscription');
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

  // Subscription search params
  let add_tag = args['add_tag'];
  let contact = args['contact'];
  let criteria = args['criteria'];
  let payload = args['payload'];
  let status = args['status'];
  let type = args['type'];
  let url = args['url'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (add_tag) {
    query.add_tag = stringQueryBuilder(add_tag);
  }

  if (contact) {
    query.contact = stringQueryBuilder(contact);
  }

  if (criteria) {
    query.criteria = stringQueryBuilder(criteria);
  }

  if (payload) {
    query.payload = stringQueryBuilder(payload);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (url) {
    query.url = stringQueryBuilder(url);
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

  // Subscription search params for DSTU2
  let add_tag = args['add_tag'];
  let contact = args['contact'];
  let criteria = args['criteria'];
  let payload = args['payload'];
  let status = args['status'];
  let type = args['type'];
  let url = args['url'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (add_tag) {
    query.add_tag = stringQueryBuilder(add_tag);
  }

  if (contact) {
    query.contact = stringQueryBuilder(contact);
  }

  if (criteria) {
    query.criteria = stringQueryBuilder(criteria);
  }

  if (payload) {
    query.payload = stringQueryBuilder(payload);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Subscription >>> search');

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
  let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${base_version}`);
  let Subscription = getSubscription(base_version);

  try {
    // Query our collection for this subscription
    const cursor = collection.find(query);
    const subscriptions = await cursor.toArray();

    subscriptions.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Subscription(element);
    });

    return toSearchBundle(subscriptions);
  } catch (err) {
    logger.error('Error with Subscription.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Subscription >>> searchById');

  let { base_version, id } = args;
  let Subscription = getSubscription(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${base_version}`);

  try {
    // Query our collection for this subscription
    const subscription = await collection.findOne({ id: id.toString() });

    if (subscription) {
      delete subscription._id;
      return new Subscription(subscription);
    }
    return null;
  } catch (err) {
    logger.error('Error with Subscription.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Subscription >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${base_version}`);

    // Get current record
    let Subscription = getSubscription(base_version);
    let subscription = new Subscription(resource);
    delete subscription._id;

    // If no resource ID was provided, generate one.
    let id = subscription.id || getUuid();
    if (!subscription.id) {
      subscription.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    subscription.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(subscription));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Subscription created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Subscription >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${base_version}`);

    // Get current record
    let Subscription = getSubscription(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Subscription Class
    let subscription = new Subscription(resource);
    delete subscription._id;
    subscription.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(subscription));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Subscription updated with id: ' + id);
      resolve({
        id: subscription.id,
        created: false,
        resource_version: subscription.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Subscription >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Subscription deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Subscription >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Subscription = getSubscription(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${base_version}`);

    // Query our collection for this subscription with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((subscription) => {
      if (subscription) {
        delete subscription._id;
        resolve(new Subscription(subscription));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Subscription >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let add_tag = args['add_tag'];
    let contact = args['contact'];
    let criteria = args['criteria'];
    let payload = args['payload'];
    let status = args['status'];
    let type = args['type'];
    let url = args['url'];

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
    let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${base_version}`);
    let Subscription = getSubscription(base_version);

    // Query our collection for subscription history
    collection.find(query).toArray().then((subscriptions) => {
      subscriptions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Subscription(element);
      });
      resolve(subscriptions);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Subscription >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let add_tag = args['add_tag'];
    let contact = args['contact'];
    let criteria = args['criteria'];
    let payload = args['payload'];
    let status = args['status'];
    let type = args['type'];
    let url = args['url'];

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
    let collection = db.collection(`${COLLECTION.SUBSCRIPTION}_${base_version}`);
    let Subscription = getSubscription(base_version);

    // Query our collection for subscription history by id
    collection.find(query).toArray().then((subscriptions) => {
      subscriptions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Subscription(element);
      });
      resolve(subscriptions);
    }).catch(_reject);
  });
