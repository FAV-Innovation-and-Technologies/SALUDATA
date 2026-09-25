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

let getEligibilityrequest = (base_version) => {
  return resolveSchema(base_version, 'Eligibilityrequest');
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

  // Eligibilityrequest search params
  let created = args['created'];
  let enterer = args['enterer'];
  let facility = args['facility'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let provider = args['provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (created) {
    query.created = stringQueryBuilder(created);
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

  if (provider) {
    query.provider = stringQueryBuilder(provider);
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

  // Eligibilityrequest search params for DSTU2
  let created = args['created'];
  let enterer = args['enterer'];
  let facility = args['facility'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let provider = args['provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (created) {
    query.created = stringQueryBuilder(created);
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

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Eligibilityrequest >>> search');

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
  let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${base_version}`);
  let Eligibilityrequest = getEligibilityrequest(base_version);

  try {
    // Query our collection for this eligibilityrequest
    const cursor = collection.find(query);
    const eligibilityrequests = await cursor.toArray();

    eligibilityrequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Eligibilityrequest(element);
    });

    return toSearchBundle(eligibilityrequests);
  } catch (err) {
    logger.error('Error with Eligibilityrequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Eligibilityrequest >>> searchById');

  let { base_version, id } = args;
  let Eligibilityrequest = getEligibilityrequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${base_version}`);

  try {
    // Query our collection for this eligibilityrequest
    const eligibilityrequest = await collection.findOne({ id: id.toString() });

    if (eligibilityrequest) {
      delete eligibilityrequest._id;
      return new Eligibilityrequest(eligibilityrequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Eligibilityrequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityrequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${base_version}`);

    // Get current record
    let Eligibilityrequest = getEligibilityrequest(base_version);
    let eligibilityrequest = new Eligibilityrequest(resource);
    delete eligibilityrequest._id;

    // If no resource ID was provided, generate one.
    let id = eligibilityrequest.id || getUuid();
    if (!eligibilityrequest.id) {
      eligibilityrequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    eligibilityrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(eligibilityrequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Eligibilityrequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityrequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${base_version}`);

    // Get current record
    let Eligibilityrequest = getEligibilityrequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Eligibilityrequest Class
    let eligibilityrequest = new Eligibilityrequest(resource);
    delete eligibilityrequest._id;
    eligibilityrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(eligibilityrequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Eligibilityrequest updated with id: ' + id);
      resolve({
        id: eligibilityrequest.id,
        created: false,
        resource_version: eligibilityrequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityrequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Eligibilityrequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityrequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Eligibilityrequest = getEligibilityrequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${base_version}`);

    // Query our collection for this eligibilityrequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((eligibilityrequest) => {
      if (eligibilityrequest) {
        delete eligibilityrequest._id;
        resolve(new Eligibilityrequest(eligibilityrequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityrequest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let created = args['created'];
    let enterer = args['enterer'];
    let facility = args['facility'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let patient = args['patient'];
    let provider = args['provider'];

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
    let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${base_version}`);
    let Eligibilityrequest = getEligibilityrequest(base_version);

    // Query our collection for eligibilityrequest history
    collection.find(query).toArray().then((eligibilityrequests) => {
      eligibilityrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Eligibilityrequest(element);
      });
      resolve(eligibilityrequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Eligibilityrequest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let created = args['created'];
    let enterer = args['enterer'];
    let facility = args['facility'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let patient = args['patient'];
    let provider = args['provider'];

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
    let collection = db.collection(`${COLLECTION.ELIGIBILITYREQUEST}_${base_version}`);
    let Eligibilityrequest = getEligibilityrequest(base_version);

    // Query our collection for eligibilityrequest history by id
    collection.find(query).toArray().then((eligibilityrequests) => {
      eligibilityrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Eligibilityrequest(element);
      });
      resolve(eligibilityrequests);
    }).catch(_reject);
  });
