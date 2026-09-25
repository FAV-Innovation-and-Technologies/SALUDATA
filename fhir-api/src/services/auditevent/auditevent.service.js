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

let getAuditevent = (base_version) => {
  return resolveSchema(base_version, 'Auditevent');
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

  // Auditevent search params
  let action = args['action'];
  let address = args['address'];
  let agent = args['agent'];
  let agent_name = args['agent_name'];
  let agent_role = args['agent_role'];
  let altid = args['altid'];
  let date = args['date'];
  let entity = args['entity'];
  let entity_id = args['entity_id'];
  let entity_name = args['entity_name'];
  let entity_role = args['entity_role'];
  let entity_type = args['entity_type'];
  let outcome = args['outcome'];
  let patient = args['patient'];
  let policy = args['policy'];
  let site = args['site'];
  let source = args['source'];
  let subtype = args['subtype'];
  let type = args['type'];
  let user = args['user'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
  }

  if (address) {
    query.address = stringQueryBuilder(address);
  }

  if (agent) {
    query.agent = stringQueryBuilder(agent);
  }

  if (agent_name) {
    query.agent_name = stringQueryBuilder(agent_name);
  }

  if (agent_role) {
    query.agent_role = stringQueryBuilder(agent_role);
  }

  if (altid) {
    query.altid = stringQueryBuilder(altid);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (entity) {
    query.entity = stringQueryBuilder(entity);
  }

  if (entity_id) {
    query.entity_id = stringQueryBuilder(entity_id);
  }

  if (entity_name) {
    query.entity_name = stringQueryBuilder(entity_name);
  }

  if (entity_role) {
    query.entity_role = stringQueryBuilder(entity_role);
  }

  if (entity_type) {
    let queryBuilder = tokenQueryBuilder(entity_type, 'code', 'entity_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (policy) {
    query.policy = stringQueryBuilder(policy);
  }

  if (site) {
    query.site = stringQueryBuilder(site);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (subtype) {
    let queryBuilder = tokenQueryBuilder(subtype, 'code', 'subtype.coding');
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

  if (user) {
    query.user = stringQueryBuilder(user);
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

  // Auditevent search params for DSTU2
  let action = args['action'];
  let address = args['address'];
  let agent = args['agent'];
  let agent_name = args['agent_name'];
  let agent_role = args['agent_role'];
  let altid = args['altid'];
  let date = args['date'];
  let entity = args['entity'];
  let entity_id = args['entity_id'];
  let entity_name = args['entity_name'];
  let entity_role = args['entity_role'];
  let entity_type = args['entity_type'];
  let outcome = args['outcome'];
  let patient = args['patient'];
  let policy = args['policy'];
  let site = args['site'];
  let source = args['source'];
  let subtype = args['subtype'];
  let type = args['type'];
  let user = args['user'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
  }

  if (address) {
    query.address = stringQueryBuilder(address);
  }

  if (agent) {
    query.agent = stringQueryBuilder(agent);
  }

  if (agent_name) {
    query.agent_name = stringQueryBuilder(agent_name);
  }

  if (agent_role) {
    query.agent_role = stringQueryBuilder(agent_role);
  }

  if (altid) {
    query.altid = stringQueryBuilder(altid);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (entity) {
    query.entity = stringQueryBuilder(entity);
  }

  if (entity_id) {
    query.entity_id = stringQueryBuilder(entity_id);
  }

  if (entity_name) {
    query.entity_name = stringQueryBuilder(entity_name);
  }

  if (entity_role) {
    query.entity_role = stringQueryBuilder(entity_role);
  }

  if (entity_type) {
    let queryBuilder = tokenQueryBuilder(entity_type, 'code', 'entity_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (policy) {
    query.policy = stringQueryBuilder(policy);
  }

  if (site) {
    query.site = stringQueryBuilder(site);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (subtype) {
    let queryBuilder = tokenQueryBuilder(subtype, 'code', 'subtype.coding');
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

  if (user) {
    query.user = stringQueryBuilder(user);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Auditevent >>> search');

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
  let collection = db.collection(`${COLLECTION.AUDITEVENT}_${base_version}`);
  let Auditevent = getAuditevent(base_version);

  try {
    // Query our collection for this auditevent
    const cursor = collection.find(query);
    const auditevents = await cursor.toArray();

    auditevents.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Auditevent(element);
    });

    return toSearchBundle(auditevents);
  } catch (err) {
    logger.error('Error with Auditevent.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Auditevent >>> searchById');

  let { base_version, id } = args;
  let Auditevent = getAuditevent(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.AUDITEVENT}_${base_version}`);

  try {
    // Query our collection for this auditevent
    const auditevent = await collection.findOne({ id: id.toString() });

    if (auditevent) {
      delete auditevent._id;
      return new Auditevent(auditevent);
    }
    return null;
  } catch (err) {
    logger.error('Error with Auditevent.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Auditevent >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.AUDITEVENT}_${base_version}`);

    // Get current record
    let Auditevent = getAuditevent(base_version);
    let auditevent = new Auditevent(resource);
    delete auditevent._id;

    // If no resource ID was provided, generate one.
    let id = auditevent.id || getUuid();
    if (!auditevent.id) {
      auditevent.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    auditevent.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(auditevent));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Auditevent created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Auditevent >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.AUDITEVENT}_${base_version}`);

    // Get current record
    let Auditevent = getAuditevent(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Auditevent Class
    let auditevent = new Auditevent(resource);
    delete auditevent._id;
    auditevent.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(auditevent));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Auditevent updated with id: ' + id);
      resolve({
        id: auditevent.id,
        created: false,
        resource_version: auditevent.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Auditevent >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.AUDITEVENT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Auditevent deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Auditevent >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Auditevent = getAuditevent(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.AUDITEVENT}_${base_version}`);

    // Query our collection for this auditevent with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((auditevent) => {
      if (auditevent) {
        delete auditevent._id;
        resolve(new Auditevent(auditevent));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Auditevent >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let address = args['address'];
    let agent = args['agent'];
    let agent_name = args['agent_name'];
    let agent_role = args['agent_role'];
    let altid = args['altid'];
    let date = args['date'];
    let entity = args['entity'];
    let entity_id = args['entity_id'];
    let entity_name = args['entity_name'];
    let entity_role = args['entity_role'];
    let entity_type = args['entity_type'];
    let outcome = args['outcome'];
    let patient = args['patient'];
    let policy = args['policy'];
    let site = args['site'];
    let source = args['source'];
    let subtype = args['subtype'];
    let type = args['type'];
    let user = args['user'];

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
    let collection = db.collection(`${COLLECTION.AUDITEVENT}_${base_version}`);
    let Auditevent = getAuditevent(base_version);

    // Query our collection for auditevent history
    collection.find(query).toArray().then((auditevents) => {
      auditevents.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Auditevent(element);
      });
      resolve(auditevents);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Auditevent >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let address = args['address'];
    let agent = args['agent'];
    let agent_name = args['agent_name'];
    let agent_role = args['agent_role'];
    let altid = args['altid'];
    let date = args['date'];
    let entity = args['entity'];
    let entity_id = args['entity_id'];
    let entity_name = args['entity_name'];
    let entity_role = args['entity_role'];
    let entity_type = args['entity_type'];
    let outcome = args['outcome'];
    let patient = args['patient'];
    let policy = args['policy'];
    let site = args['site'];
    let source = args['source'];
    let subtype = args['subtype'];
    let type = args['type'];
    let user = args['user'];

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
    let collection = db.collection(`${COLLECTION.AUDITEVENT}_${base_version}`);
    let Auditevent = getAuditevent(base_version);

    // Query our collection for auditevent history by id
    collection.find(query).toArray().then((auditevents) => {
      auditevents.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Auditevent(element);
      });
      resolve(auditevents);
    }).catch(_reject);
  });
