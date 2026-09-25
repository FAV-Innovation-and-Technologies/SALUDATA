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

let getEnrollmentresponse = (base_version) => {
  return resolveSchema(base_version, 'Enrollmentresponse');
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

  // Enrollmentresponse search params
  let identifier = args['identifier'];
  let organization = args['organization'];
  let request = args['request'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (request) {
    query.request = stringQueryBuilder(request);
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

  // Enrollmentresponse search params for DSTU2
  let identifier = args['identifier'];
  let organization = args['organization'];
  let request = args['request'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (request) {
    query.request = stringQueryBuilder(request);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Enrollmentresponse >>> search');

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
  let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${base_version}`);
  let Enrollmentresponse = getEnrollmentresponse(base_version);

  try {
    // Query our collection for this enrollmentresponse
    const cursor = collection.find(query);
    const enrollmentresponses = await cursor.toArray();

    enrollmentresponses.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Enrollmentresponse(element);
    });

    return toSearchBundle(enrollmentresponses);
  } catch (err) {
    logger.error('Error with Enrollmentresponse.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Enrollmentresponse >>> searchById');

  let { base_version, id } = args;
  let Enrollmentresponse = getEnrollmentresponse(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${base_version}`);

  try {
    // Query our collection for this enrollmentresponse
    const enrollmentresponse = await collection.findOne({ id: id.toString() });

    if (enrollmentresponse) {
      delete enrollmentresponse._id;
      return new Enrollmentresponse(enrollmentresponse);
    }
    return null;
  } catch (err) {
    logger.error('Error with Enrollmentresponse.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentresponse >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${base_version}`);

    // Get current record
    let Enrollmentresponse = getEnrollmentresponse(base_version);
    let enrollmentresponse = new Enrollmentresponse(resource);
    delete enrollmentresponse._id;

    // If no resource ID was provided, generate one.
    let id = enrollmentresponse.id || getUuid();
    if (!enrollmentresponse.id) {
      enrollmentresponse.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    enrollmentresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(enrollmentresponse));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Enrollmentresponse created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentresponse >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${base_version}`);

    // Get current record
    let Enrollmentresponse = getEnrollmentresponse(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Enrollmentresponse Class
    let enrollmentresponse = new Enrollmentresponse(resource);
    delete enrollmentresponse._id;
    enrollmentresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(enrollmentresponse));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Enrollmentresponse updated with id: ' + id);
      resolve({
        id: enrollmentresponse.id,
        created: false,
        resource_version: enrollmentresponse.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentresponse >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Enrollmentresponse deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentresponse >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Enrollmentresponse = getEnrollmentresponse(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${base_version}`);

    // Query our collection for this enrollmentresponse with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((enrollmentresponse) => {
      if (enrollmentresponse) {
        delete enrollmentresponse._id;
        resolve(new Enrollmentresponse(enrollmentresponse));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentresponse >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let organization = args['organization'];
    let request = args['request'];

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
    let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${base_version}`);
    let Enrollmentresponse = getEnrollmentresponse(base_version);

    // Query our collection for enrollmentresponse history
    collection.find(query).toArray().then((enrollmentresponses) => {
      enrollmentresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Enrollmentresponse(element);
      });
      resolve(enrollmentresponses);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentresponse >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let organization = args['organization'];
    let request = args['request'];

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
    let collection = db.collection(`${COLLECTION.ENROLLMENTRESPONSE}_${base_version}`);
    let Enrollmentresponse = getEnrollmentresponse(base_version);

    // Query our collection for enrollmentresponse history by id
    collection.find(query).toArray().then((enrollmentresponses) => {
      enrollmentresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Enrollmentresponse(element);
      });
      resolve(enrollmentresponses);
    }).catch(_reject);
  });
