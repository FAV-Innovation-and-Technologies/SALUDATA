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

let getRequestgroup = (base_version) => {
  return resolveSchema(base_version, 'Requestgroup');
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

  // Requestgroup search params
  let author = args['author'];
  let authored = args['authored'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let participant = args['participant'];
  let patient = args['patient'];
  let priority = args['priority'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (authored) {
    query.authored = stringQueryBuilder(authored);
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (group_identifier) {
    let queryBuilder = tokenQueryBuilder(group_identifier, 'value', 'identifier');
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
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

  // Requestgroup search params for DSTU2
  let author = args['author'];
  let authored = args['authored'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let participant = args['participant'];
  let patient = args['patient'];
  let priority = args['priority'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (authored) {
    query.authored = stringQueryBuilder(authored);
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (group_identifier) {
    let queryBuilder = tokenQueryBuilder(group_identifier, 'value', 'identifier');
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
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

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Requestgroup >>> search');

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
  let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${base_version}`);
  let Requestgroup = getRequestgroup(base_version);

  try {
    // Query our collection for this requestgroup
    const cursor = collection.find(query);
    const requestgroups = await cursor.toArray();

    requestgroups.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Requestgroup(element);
    });

    return toSearchBundle(requestgroups);
  } catch (err) {
    logger.error('Error with Requestgroup.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Requestgroup >>> searchById');

  let { base_version, id } = args;
  let Requestgroup = getRequestgroup(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${base_version}`);

  try {
    // Query our collection for this requestgroup
    const requestgroup = await collection.findOne({ id: id.toString() });

    if (requestgroup) {
      delete requestgroup._id;
      return new Requestgroup(requestgroup);
    }
    return null;
  } catch (err) {
    logger.error('Error with Requestgroup.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Requestgroup >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${base_version}`);

    // Get current record
    let Requestgroup = getRequestgroup(base_version);
    let requestgroup = new Requestgroup(resource);
    delete requestgroup._id;

    // If no resource ID was provided, generate one.
    let id = requestgroup.id || getUuid();
    if (!requestgroup.id) {
      requestgroup.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    requestgroup.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(requestgroup));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Requestgroup created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Requestgroup >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${base_version}`);

    // Get current record
    let Requestgroup = getRequestgroup(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Requestgroup Class
    let requestgroup = new Requestgroup(resource);
    delete requestgroup._id;
    requestgroup.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(requestgroup));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Requestgroup updated with id: ' + id);
      resolve({
        id: requestgroup.id,
        created: false,
        resource_version: requestgroup.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Requestgroup >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Requestgroup deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Requestgroup >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Requestgroup = getRequestgroup(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${base_version}`);

    // Query our collection for this requestgroup with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((requestgroup) => {
      if (requestgroup) {
        delete requestgroup._id;
        resolve(new Requestgroup(requestgroup));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Requestgroup >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let authored = args['authored'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let participant = args['participant'];
    let patient = args['patient'];
    let priority = args['priority'];
    let status = args['status'];
    let subject = args['subject'];

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
    let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${base_version}`);
    let Requestgroup = getRequestgroup(base_version);

    // Query our collection for requestgroup history
    collection.find(query).toArray().then((requestgroups) => {
      requestgroups.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Requestgroup(element);
      });
      resolve(requestgroups);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Requestgroup >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let authored = args['authored'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let participant = args['participant'];
    let patient = args['patient'];
    let priority = args['priority'];
    let status = args['status'];
    let subject = args['subject'];

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
    let collection = db.collection(`${COLLECTION.REQUESTGROUP}_${base_version}`);
    let Requestgroup = getRequestgroup(base_version);

    // Query our collection for requestgroup history by id
    collection.find(query).toArray().then((requestgroups) => {
      requestgroups.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Requestgroup(element);
      });
      resolve(requestgroups);
    }).catch(_reject);
  });
