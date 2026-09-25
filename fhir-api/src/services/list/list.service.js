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

let getList = (base_version) => {
  return resolveSchema(base_version, 'List');
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

  // List search params
  let code = args['code'];
  let date = args['date'];
  let empty_reason = args['empty_reason'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let item = args['item'];
  let notes = args['notes'];
  let patient = args['patient'];
  let source = args['source'];
  let status = args['status'];
  let subject = args['subject'];
  let title = args['title'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (empty_reason) {
    query.empty_reason = stringQueryBuilder(empty_reason);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (item) {
    query.item = stringQueryBuilder(item);
  }

  if (notes) {
    query.notes = stringQueryBuilder(notes);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
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

  // List search params for DSTU2
  let code = args['code'];
  let date = args['date'];
  let empty_reason = args['empty_reason'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let item = args['item'];
  let notes = args['notes'];
  let patient = args['patient'];
  let source = args['source'];
  let status = args['status'];
  let subject = args['subject'];
  let title = args['title'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (empty_reason) {
    query.empty_reason = stringQueryBuilder(empty_reason);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (item) {
    query.item = stringQueryBuilder(item);
  }

  if (notes) {
    query.notes = stringQueryBuilder(notes);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('List >>> search');

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
  let collection = db.collection(`${COLLECTION.LIST}_${base_version}`);
  let List = getList(base_version);

  try {
    // Query our collection for this list
    const cursor = collection.find(query);
    const lists = await cursor.toArray();

    lists.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new List(element);
    });

    return toSearchBundle(lists);
  } catch (err) {
    logger.error('Error with List.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('List >>> searchById');

  let { base_version, id } = args;
  let List = getList(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.LIST}_${base_version}`);

  try {
    // Query our collection for this list
    const list = await collection.findOne({ id: id.toString() });

    if (list) {
      delete list._id;
      return new List(list);
    }
    return null;
  } catch (err) {
    logger.error('Error with List.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('List >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LIST}_${base_version}`);

    // Get current record
    let List = getList(base_version);
    let list = new List(resource);
    delete list._id;

    // If no resource ID was provided, generate one.
    let id = list.id || getUuid();
    if (!list.id) {
      list.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    list.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(list));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('List created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('List >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LIST}_${base_version}`);

    // Get current record
    let List = getList(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to List Class
    let list = new List(resource);
    delete list._id;
    list.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(list));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('List updated with id: ' + id);
      resolve({
        id: list.id,
        created: false,
        resource_version: list.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('List >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LIST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('List deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('List >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let List = getList(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LIST}_${base_version}`);

    // Query our collection for this list with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((list) => {
      if (list) {
        delete list._id;
        resolve(new List(list));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('List >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let date = args['date'];
    let empty_reason = args['empty_reason'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let item = args['item'];
    let notes = args['notes'];
    let patient = args['patient'];
    let source = args['source'];
    let status = args['status'];
    let subject = args['subject'];
    let title = args['title'];

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
    let collection = db.collection(`${COLLECTION.LIST}_${base_version}`);
    let List = getList(base_version);

    // Query our collection for list history
    collection.find(query).toArray().then((lists) => {
      lists.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new List(element);
      });
      resolve(lists);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('List >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let date = args['date'];
    let empty_reason = args['empty_reason'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let item = args['item'];
    let notes = args['notes'];
    let patient = args['patient'];
    let source = args['source'];
    let status = args['status'];
    let subject = args['subject'];
    let title = args['title'];

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
    let collection = db.collection(`${COLLECTION.LIST}_${base_version}`);
    let List = getList(base_version);

    // Query our collection for list history by id
    collection.find(query).toArray().then((lists) => {
      lists.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new List(element);
      });
      resolve(lists);
    }).catch(_reject);
  });
