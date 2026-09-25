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

let getProvenance = (base_version) => {
  return resolveSchema(base_version, 'Provenance');
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

  // Provenance search params
  let agent = args['agent'];
  let agent_role = args['agent_role'];
  let end = args['end'];
  let entity_id = args['entity_id'];
  let entity_ref = args['entity_ref'];
  let location = args['location'];
  let patient = args['patient'];
  let recorded = args['recorded'];
  let signature_type = args['signature_type'];
  let start = args['start'];
  let target = args['target'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (agent) {
    query.agent = stringQueryBuilder(agent);
  }

  if (agent_role) {
    query.agent_role = stringQueryBuilder(agent_role);
  }

  if (end) {
    query.end = stringQueryBuilder(end);
  }

  if (entity_id) {
    query.entity_id = stringQueryBuilder(entity_id);
  }

  if (entity_ref) {
    query.entity_ref = stringQueryBuilder(entity_ref);
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (recorded) {
    query.recorded = stringQueryBuilder(recorded);
  }

  if (signature_type) {
    let queryBuilder = tokenQueryBuilder(signature_type, 'code', 'signature_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (start) {
    query.start = stringQueryBuilder(start);
  }

  if (target) {
    query.target = stringQueryBuilder(target);
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

  // Provenance search params for DSTU2
  let agent = args['agent'];
  let agent_role = args['agent_role'];
  let end = args['end'];
  let entity_id = args['entity_id'];
  let entity_ref = args['entity_ref'];
  let location = args['location'];
  let patient = args['patient'];
  let recorded = args['recorded'];
  let signature_type = args['signature_type'];
  let start = args['start'];
  let target = args['target'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (agent) {
    query.agent = stringQueryBuilder(agent);
  }

  if (agent_role) {
    query.agent_role = stringQueryBuilder(agent_role);
  }

  if (end) {
    query.end = stringQueryBuilder(end);
  }

  if (entity_id) {
    query.entity_id = stringQueryBuilder(entity_id);
  }

  if (entity_ref) {
    query.entity_ref = stringQueryBuilder(entity_ref);
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (recorded) {
    query.recorded = stringQueryBuilder(recorded);
  }

  if (signature_type) {
    let queryBuilder = tokenQueryBuilder(signature_type, 'code', 'signature_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (start) {
    query.start = stringQueryBuilder(start);
  }

  if (target) {
    query.target = stringQueryBuilder(target);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Provenance >>> search');

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
  let collection = db.collection(`${COLLECTION.PROVENANCE}_${base_version}`);
  let Provenance = getProvenance(base_version);

  try {
    // Query our collection for this provenance
    const cursor = collection.find(query);
    const provenances = await cursor.toArray();

    provenances.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Provenance(element);
    });

    return toSearchBundle(provenances);
  } catch (err) {
    logger.error('Error with Provenance.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Provenance >>> searchById');

  let { base_version, id } = args;
  let Provenance = getProvenance(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PROVENANCE}_${base_version}`);

  try {
    // Query our collection for this provenance
    const provenance = await collection.findOne({ id: id.toString() });

    if (provenance) {
      delete provenance._id;
      return new Provenance(provenance);
    }
    return null;
  } catch (err) {
    logger.error('Error with Provenance.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Provenance >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROVENANCE}_${base_version}`);

    // Get current record
    let Provenance = getProvenance(base_version);
    let provenance = new Provenance(resource);
    delete provenance._id;

    // If no resource ID was provided, generate one.
    let id = provenance.id || getUuid();
    if (!provenance.id) {
      provenance.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    provenance.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(provenance));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Provenance created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Provenance >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROVENANCE}_${base_version}`);

    // Get current record
    let Provenance = getProvenance(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Provenance Class
    let provenance = new Provenance(resource);
    delete provenance._id;
    provenance.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(provenance));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Provenance updated with id: ' + id);
      resolve({
        id: provenance.id,
        created: false,
        resource_version: provenance.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Provenance >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROVENANCE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Provenance deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Provenance >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Provenance = getProvenance(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROVENANCE}_${base_version}`);

    // Query our collection for this provenance with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((provenance) => {
      if (provenance) {
        delete provenance._id;
        resolve(new Provenance(provenance));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Provenance >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let agent = args['agent'];
    let agent_role = args['agent_role'];
    let end = args['end'];
    let entity_id = args['entity_id'];
    let entity_ref = args['entity_ref'];
    let location = args['location'];
    let patient = args['patient'];
    let recorded = args['recorded'];
    let signature_type = args['signature_type'];
    let start = args['start'];
    let target = args['target'];

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
    let collection = db.collection(`${COLLECTION.PROVENANCE}_${base_version}`);
    let Provenance = getProvenance(base_version);

    // Query our collection for provenance history
    collection.find(query).toArray().then((provenances) => {
      provenances.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Provenance(element);
      });
      resolve(provenances);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Provenance >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let agent = args['agent'];
    let agent_role = args['agent_role'];
    let end = args['end'];
    let entity_id = args['entity_id'];
    let entity_ref = args['entity_ref'];
    let location = args['location'];
    let patient = args['patient'];
    let recorded = args['recorded'];
    let signature_type = args['signature_type'];
    let start = args['start'];
    let target = args['target'];

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
    let collection = db.collection(`${COLLECTION.PROVENANCE}_${base_version}`);
    let Provenance = getProvenance(base_version);

    // Query our collection for provenance history by id
    collection.find(query).toArray().then((provenances) => {
      provenances.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Provenance(element);
      });
      resolve(provenances);
    }).catch(_reject);
  });
