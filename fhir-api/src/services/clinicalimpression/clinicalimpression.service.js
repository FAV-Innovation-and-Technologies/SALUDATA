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

let getClinicalimpression = (base_version) => {
  return resolveSchema(base_version, 'Clinicalimpression');
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

  // Clinicalimpression search params
  let action = args['action'];
  let assessor = args['assessor'];
  let date = args['date'];
  let finding_code = args['finding_code'];
  let finding_ref = args['finding_ref'];
  let identifier = args['identifier'];
  let investigation = args['investigation'];
  let patient = args['patient'];
  let previous = args['previous'];
  let problem = args['problem'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
  }

  if (assessor) {
    query.assessor = stringQueryBuilder(assessor);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (finding_code) {
    query.finding_code = stringQueryBuilder(finding_code);
  }

  if (finding_ref) {
    query.finding_ref = stringQueryBuilder(finding_ref);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (investigation) {
    query.investigation = stringQueryBuilder(investigation);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (previous) {
    query.previous = stringQueryBuilder(previous);
  }

  if (problem) {
    query.problem = stringQueryBuilder(problem);
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

  // Clinicalimpression search params for DSTU2
  let action = args['action'];
  let assessor = args['assessor'];
  let date = args['date'];
  let finding_code = args['finding_code'];
  let finding_ref = args['finding_ref'];
  let identifier = args['identifier'];
  let investigation = args['investigation'];
  let patient = args['patient'];
  let previous = args['previous'];
  let problem = args['problem'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
  }

  if (assessor) {
    query.assessor = stringQueryBuilder(assessor);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (finding_code) {
    query.finding_code = stringQueryBuilder(finding_code);
  }

  if (finding_ref) {
    query.finding_ref = stringQueryBuilder(finding_ref);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (investigation) {
    query.investigation = stringQueryBuilder(investigation);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (previous) {
    query.previous = stringQueryBuilder(previous);
  }

  if (problem) {
    query.problem = stringQueryBuilder(problem);
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
  logger.info('Clinicalimpression >>> search');

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
  let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${base_version}`);
  let Clinicalimpression = getClinicalimpression(base_version);

  try {
    // Query our collection for this clinicalimpression
    const cursor = collection.find(query);
    const clinicalimpressions = await cursor.toArray();

    clinicalimpressions.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Clinicalimpression(element);
    });

    return toSearchBundle(clinicalimpressions);
  } catch (err) {
    logger.error('Error with Clinicalimpression.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Clinicalimpression >>> searchById');

  let { base_version, id } = args;
  let Clinicalimpression = getClinicalimpression(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${base_version}`);

  try {
    // Query our collection for this clinicalimpression
    const clinicalimpression = await collection.findOne({ id: id.toString() });

    if (clinicalimpression) {
      delete clinicalimpression._id;
      return new Clinicalimpression(clinicalimpression);
    }
    return null;
  } catch (err) {
    logger.error('Error with Clinicalimpression.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Clinicalimpression >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${base_version}`);

    // Get current record
    let Clinicalimpression = getClinicalimpression(base_version);
    let clinicalimpression = new Clinicalimpression(resource);
    delete clinicalimpression._id;

    // If no resource ID was provided, generate one.
    let id = clinicalimpression.id || getUuid();
    if (!clinicalimpression.id) {
      clinicalimpression.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    clinicalimpression.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(clinicalimpression));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Clinicalimpression created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Clinicalimpression >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${base_version}`);

    // Get current record
    let Clinicalimpression = getClinicalimpression(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Clinicalimpression Class
    let clinicalimpression = new Clinicalimpression(resource);
    delete clinicalimpression._id;
    clinicalimpression.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(clinicalimpression));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Clinicalimpression updated with id: ' + id);
      resolve({
        id: clinicalimpression.id,
        created: false,
        resource_version: clinicalimpression.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Clinicalimpression >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Clinicalimpression deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Clinicalimpression >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Clinicalimpression = getClinicalimpression(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${base_version}`);

    // Query our collection for this clinicalimpression with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((clinicalimpression) => {
      if (clinicalimpression) {
        delete clinicalimpression._id;
        resolve(new Clinicalimpression(clinicalimpression));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Clinicalimpression >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let assessor = args['assessor'];
    let date = args['date'];
    let finding_code = args['finding_code'];
    let finding_ref = args['finding_ref'];
    let identifier = args['identifier'];
    let investigation = args['investigation'];
    let patient = args['patient'];
    let previous = args['previous'];
    let problem = args['problem'];
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
    let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${base_version}`);
    let Clinicalimpression = getClinicalimpression(base_version);

    // Query our collection for clinicalimpression history
    collection.find(query).toArray().then((clinicalimpressions) => {
      clinicalimpressions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Clinicalimpression(element);
      });
      resolve(clinicalimpressions);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Clinicalimpression >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let assessor = args['assessor'];
    let date = args['date'];
    let finding_code = args['finding_code'];
    let finding_ref = args['finding_ref'];
    let identifier = args['identifier'];
    let investigation = args['investigation'];
    let patient = args['patient'];
    let previous = args['previous'];
    let problem = args['problem'];
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
    let collection = db.collection(`${COLLECTION.CLINICALIMPRESSION}_${base_version}`);
    let Clinicalimpression = getClinicalimpression(base_version);

    // Query our collection for clinicalimpression history by id
    collection.find(query).toArray().then((clinicalimpressions) => {
      clinicalimpressions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Clinicalimpression(element);
      });
      resolve(clinicalimpressions);
    }).catch(_reject);
  });
