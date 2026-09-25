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

let getEnrollmentrequest = (base_version) => {
  return resolveSchema(base_version, 'Enrollmentrequest');
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

  // Enrollmentrequest search params
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let subject = args['subject'];

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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
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

  // Enrollmentrequest search params for DSTU2
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let subject = args['subject'];

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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
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
  logger.info('Enrollmentrequest >>> search');

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
  let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${base_version}`);
  let Enrollmentrequest = getEnrollmentrequest(base_version);

  try {
    // Query our collection for this enrollmentrequest
    const cursor = collection.find(query);
    const enrollmentrequests = await cursor.toArray();

    enrollmentrequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Enrollmentrequest(element);
    });

    return toSearchBundle(enrollmentrequests);
  } catch (err) {
    logger.error('Error with Enrollmentrequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Enrollmentrequest >>> searchById');

  let { base_version, id } = args;
  let Enrollmentrequest = getEnrollmentrequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${base_version}`);

  try {
    // Query our collection for this enrollmentrequest
    const enrollmentrequest = await collection.findOne({ id: id.toString() });

    if (enrollmentrequest) {
      delete enrollmentrequest._id;
      return new Enrollmentrequest(enrollmentrequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Enrollmentrequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentrequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${base_version}`);

    // Get current record
    let Enrollmentrequest = getEnrollmentrequest(base_version);
    let enrollmentrequest = new Enrollmentrequest(resource);
    delete enrollmentrequest._id;

    // If no resource ID was provided, generate one.
    let id = enrollmentrequest.id || getUuid();
    if (!enrollmentrequest.id) {
      enrollmentrequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    enrollmentrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(enrollmentrequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Enrollmentrequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentrequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${base_version}`);

    // Get current record
    let Enrollmentrequest = getEnrollmentrequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Enrollmentrequest Class
    let enrollmentrequest = new Enrollmentrequest(resource);
    delete enrollmentrequest._id;
    enrollmentrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(enrollmentrequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Enrollmentrequest updated with id: ' + id);
      resolve({
        id: enrollmentrequest.id,
        created: false,
        resource_version: enrollmentrequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentrequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Enrollmentrequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentrequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Enrollmentrequest = getEnrollmentrequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${base_version}`);

    // Query our collection for this enrollmentrequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((enrollmentrequest) => {
      if (enrollmentrequest) {
        delete enrollmentrequest._id;
        resolve(new Enrollmentrequest(enrollmentrequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentrequest >>> history');

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
    let patient = args['patient'];
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
    let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${base_version}`);
    let Enrollmentrequest = getEnrollmentrequest(base_version);

    // Query our collection for enrollmentrequest history
    collection.find(query).toArray().then((enrollmentrequests) => {
      enrollmentrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Enrollmentrequest(element);
      });
      resolve(enrollmentrequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Enrollmentrequest >>> historyById');

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
    let patient = args['patient'];
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
    let collection = db.collection(`${COLLECTION.ENROLLMENTREQUEST}_${base_version}`);
    let Enrollmentrequest = getEnrollmentrequest(base_version);

    // Query our collection for enrollmentrequest history by id
    collection.find(query).toArray().then((enrollmentrequests) => {
      enrollmentrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Enrollmentrequest(element);
      });
      resolve(enrollmentrequests);
    }).catch(_reject);
  });
