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

let getGroup = (base_version) => {
  return resolveSchema(base_version, 'Group');
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

  // Group search params
  let actual = args['actual'];
  let characteristic = args['characteristic'];
  let characteristic_value = args['characteristic_value'];
  let code = args['code'];
  let exclude = args['exclude'];
  let identifier = args['identifier'];
  let member = args['member'];
  let type = args['type'];
  let value = args['value'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (actual) {
    query.actual = stringQueryBuilder(actual);
  }

  if (characteristic) {
    query.characteristic = stringQueryBuilder(characteristic);
  }

  if (characteristic_value) {
    query.characteristic_value = stringQueryBuilder(characteristic_value);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (exclude) {
    query.exclude = stringQueryBuilder(exclude);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (member) {
    query.member = stringQueryBuilder(member);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (value) {
    query.value = stringQueryBuilder(value);
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

  // Group search params for DSTU2
  let actual = args['actual'];
  let characteristic = args['characteristic'];
  let characteristic_value = args['characteristic_value'];
  let code = args['code'];
  let exclude = args['exclude'];
  let identifier = args['identifier'];
  let member = args['member'];
  let type = args['type'];
  let value = args['value'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (actual) {
    query.actual = stringQueryBuilder(actual);
  }

  if (characteristic) {
    query.characteristic = stringQueryBuilder(characteristic);
  }

  if (characteristic_value) {
    query.characteristic_value = stringQueryBuilder(characteristic_value);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (exclude) {
    query.exclude = stringQueryBuilder(exclude);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (member) {
    query.member = stringQueryBuilder(member);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (value) {
    query.value = stringQueryBuilder(value);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Group >>> search');

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
  let collection = db.collection(`${COLLECTION.GROUP}_${base_version}`);
  let Group = getGroup(base_version);

  try {
    // Query our collection for this group
    const cursor = collection.find(query);
    const groups = await cursor.toArray();

    groups.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Group(element);
    });

    return toSearchBundle(groups);
  } catch (err) {
    logger.error('Error with Group.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Group >>> searchById');

  let { base_version, id } = args;
  let Group = getGroup(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.GROUP}_${base_version}`);

  try {
    // Query our collection for this group
    const group = await collection.findOne({ id: id.toString() });

    if (group) {
      delete group._id;
      return new Group(group);
    }
    return null;
  } catch (err) {
    logger.error('Error with Group.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Group >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.GROUP}_${base_version}`);

    // Get current record
    let Group = getGroup(base_version);
    let group = new Group(resource);
    delete group._id;

    // If no resource ID was provided, generate one.
    let id = group.id || getUuid();
    if (!group.id) {
      group.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    group.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(group));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Group created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Group >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.GROUP}_${base_version}`);

    // Get current record
    let Group = getGroup(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Group Class
    let group = new Group(resource);
    delete group._id;
    group.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(group));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Group updated with id: ' + id);
      resolve({
        id: group.id,
        created: false,
        resource_version: group.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Group >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.GROUP}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Group deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Group >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Group = getGroup(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.GROUP}_${base_version}`);

    // Query our collection for this group with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((group) => {
      if (group) {
        delete group._id;
        resolve(new Group(group));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Group >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let actual = args['actual'];
    let characteristic = args['characteristic'];
    let characteristic_value = args['characteristic_value'];
    let code = args['code'];
    let exclude = args['exclude'];
    let identifier = args['identifier'];
    let member = args['member'];
    let type = args['type'];
    let value = args['value'];

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
    let collection = db.collection(`${COLLECTION.GROUP}_${base_version}`);
    let Group = getGroup(base_version);

    // Query our collection for group history
    collection.find(query).toArray().then((groups) => {
      groups.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Group(element);
      });
      resolve(groups);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Group >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let actual = args['actual'];
    let characteristic = args['characteristic'];
    let characteristic_value = args['characteristic_value'];
    let code = args['code'];
    let exclude = args['exclude'];
    let identifier = args['identifier'];
    let member = args['member'];
    let type = args['type'];
    let value = args['value'];

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
    let collection = db.collection(`${COLLECTION.GROUP}_${base_version}`);
    let Group = getGroup(base_version);

    // Query our collection for group history by id
    collection.find(query).toArray().then((groups) => {
      groups.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Group(element);
      });
      resolve(groups);
    }).catch(_reject);
  });
