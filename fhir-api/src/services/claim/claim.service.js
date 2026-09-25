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

let getClaim = (base_version) => {
  return resolveSchema(base_version, 'Claim');
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

  // Claim search params
  let care_team = args['care_team'];
  let created = args['created'];
  let encounter = args['encounter'];
  let enterer = args['enterer'];
  let facility = args['facility'];
  let identifier = args['identifier'];
  let insurer = args['insurer'];
  let organization = args['organization'];
  let patient = args['patient'];
  let payee = args['payee'];
  let priority = args['priority'];
  let provider = args['provider'];
  let use = args['use'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (care_team) {
    query.care_team = stringQueryBuilder(care_team);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (facility) {
    query.facility = stringQueryBuilder(facility);
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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (payee) {
    query.payee = stringQueryBuilder(payee);
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (use) {
    query.use = stringQueryBuilder(use);
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

  // Claim search params for DSTU2
  let care_team = args['care_team'];
  let created = args['created'];
  let encounter = args['encounter'];
  let enterer = args['enterer'];
  let facility = args['facility'];
  let identifier = args['identifier'];
  let insurer = args['insurer'];
  let organization = args['organization'];
  let patient = args['patient'];
  let payee = args['payee'];
  let priority = args['priority'];
  let provider = args['provider'];
  let use = args['use'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (care_team) {
    query.care_team = stringQueryBuilder(care_team);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (facility) {
    query.facility = stringQueryBuilder(facility);
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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (payee) {
    query.payee = stringQueryBuilder(payee);
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (use) {
    query.use = stringQueryBuilder(use);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Claim >>> search');

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
  let collection = db.collection(`${COLLECTION.CLAIM}_${base_version}`);
  let Claim = getClaim(base_version);

  try {
    // Query our collection for this claim
    const cursor = collection.find(query);
    const claims = await cursor.toArray();

    claims.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Claim(element);
    });

    return toSearchBundle(claims);
  } catch (err) {
    logger.error('Error with Claim.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Claim >>> searchById');

  let { base_version, id } = args;
  let Claim = getClaim(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CLAIM}_${base_version}`);

  try {
    // Query our collection for this claim
    const claim = await collection.findOne({ id: id.toString() });

    if (claim) {
      delete claim._id;
      return new Claim(claim);
    }
    return null;
  } catch (err) {
    logger.error('Error with Claim.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Claim >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIM}_${base_version}`);

    // Get current record
    let Claim = getClaim(base_version);
    let claim = new Claim(resource);
    delete claim._id;

    // If no resource ID was provided, generate one.
    let id = claim.id || getUuid();
    if (!claim.id) {
      claim.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    claim.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(claim));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Claim created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Claim >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIM}_${base_version}`);

    // Get current record
    let Claim = getClaim(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Claim Class
    let claim = new Claim(resource);
    delete claim._id;
    claim.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(claim));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Claim updated with id: ' + id);
      resolve({
        id: claim.id,
        created: false,
        resource_version: claim.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claim >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIM}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Claim deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claim >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Claim = getClaim(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLAIM}_${base_version}`);

    // Query our collection for this claim with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((claim) => {
      if (claim) {
        delete claim._id;
        resolve(new Claim(claim));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claim >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let care_team = args['care_team'];
    let created = args['created'];
    let encounter = args['encounter'];
    let enterer = args['enterer'];
    let facility = args['facility'];
    let identifier = args['identifier'];
    let insurer = args['insurer'];
    let organization = args['organization'];
    let patient = args['patient'];
    let payee = args['payee'];
    let priority = args['priority'];
    let provider = args['provider'];
    let use = args['use'];

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
    let collection = db.collection(`${COLLECTION.CLAIM}_${base_version}`);
    let Claim = getClaim(base_version);

    // Query our collection for claim history
    collection.find(query).toArray().then((claims) => {
      claims.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Claim(element);
      });
      resolve(claims);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Claim >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let care_team = args['care_team'];
    let created = args['created'];
    let encounter = args['encounter'];
    let enterer = args['enterer'];
    let facility = args['facility'];
    let identifier = args['identifier'];
    let insurer = args['insurer'];
    let organization = args['organization'];
    let patient = args['patient'];
    let payee = args['payee'];
    let priority = args['priority'];
    let provider = args['provider'];
    let use = args['use'];

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
    let collection = db.collection(`${COLLECTION.CLAIM}_${base_version}`);
    let Claim = getClaim(base_version);

    // Query our collection for claim history by id
    collection.find(query).toArray().then((claims) => {
      claims.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Claim(element);
      });
      resolve(claims);
    }).catch(_reject);
  });
