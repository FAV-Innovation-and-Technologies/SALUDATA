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

let getRiskassessment = (base_version) => {
  return resolveSchema(base_version, 'Riskassessment');
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

  // Riskassessment search params
  let condition = args['condition'];
  let date = args['date'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let method = args['method'];
  let patient = args['patient'];
  let performer = args['performer'];
  let probability = args['probability'];
  let risk = args['risk'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (condition) {
    query.condition = stringQueryBuilder(condition);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (method) {
    query.method = stringQueryBuilder(method);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (probability) {
    query.probability = stringQueryBuilder(probability);
  }

  if (risk) {
    query.risk = stringQueryBuilder(risk);
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

  // Riskassessment search params for DSTU2
  let condition = args['condition'];
  let date = args['date'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let method = args['method'];
  let patient = args['patient'];
  let performer = args['performer'];
  let probability = args['probability'];
  let risk = args['risk'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (condition) {
    query.condition = stringQueryBuilder(condition);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (method) {
    query.method = stringQueryBuilder(method);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (probability) {
    query.probability = stringQueryBuilder(probability);
  }

  if (risk) {
    query.risk = stringQueryBuilder(risk);
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
  logger.info('Riskassessment >>> search');

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
  let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${base_version}`);
  let Riskassessment = getRiskassessment(base_version);

  try {
    // Query our collection for this riskassessment
    const cursor = collection.find(query);
    const riskassessments = await cursor.toArray();

    riskassessments.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Riskassessment(element);
    });

    return toSearchBundle(riskassessments);
  } catch (err) {
    logger.error('Error with Riskassessment.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Riskassessment >>> searchById');

  let { base_version, id } = args;
  let Riskassessment = getRiskassessment(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${base_version}`);

  try {
    // Query our collection for this riskassessment
    const riskassessment = await collection.findOne({ id: id.toString() });

    if (riskassessment) {
      delete riskassessment._id;
      return new Riskassessment(riskassessment);
    }
    return null;
  } catch (err) {
    logger.error('Error with Riskassessment.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Riskassessment >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${base_version}`);

    // Get current record
    let Riskassessment = getRiskassessment(base_version);
    let riskassessment = new Riskassessment(resource);
    delete riskassessment._id;

    // If no resource ID was provided, generate one.
    let id = riskassessment.id || getUuid();
    if (!riskassessment.id) {
      riskassessment.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    riskassessment.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(riskassessment));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Riskassessment created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Riskassessment >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${base_version}`);

    // Get current record
    let Riskassessment = getRiskassessment(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Riskassessment Class
    let riskassessment = new Riskassessment(resource);
    delete riskassessment._id;
    riskassessment.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(riskassessment));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Riskassessment updated with id: ' + id);
      resolve({
        id: riskassessment.id,
        created: false,
        resource_version: riskassessment.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Riskassessment >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Riskassessment deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Riskassessment >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Riskassessment = getRiskassessment(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${base_version}`);

    // Query our collection for this riskassessment with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((riskassessment) => {
      if (riskassessment) {
        delete riskassessment._id;
        resolve(new Riskassessment(riskassessment));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Riskassessment >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let condition = args['condition'];
    let date = args['date'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let method = args['method'];
    let patient = args['patient'];
    let performer = args['performer'];
    let probability = args['probability'];
    let risk = args['risk'];
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
    let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${base_version}`);
    let Riskassessment = getRiskassessment(base_version);

    // Query our collection for riskassessment history
    collection.find(query).toArray().then((riskassessments) => {
      riskassessments.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Riskassessment(element);
      });
      resolve(riskassessments);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Riskassessment >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let condition = args['condition'];
    let date = args['date'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let method = args['method'];
    let patient = args['patient'];
    let performer = args['performer'];
    let probability = args['probability'];
    let risk = args['risk'];
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
    let collection = db.collection(`${COLLECTION.RISKASSESSMENT}_${base_version}`);
    let Riskassessment = getRiskassessment(base_version);

    // Query our collection for riskassessment history by id
    collection.find(query).toArray().then((riskassessments) => {
      riskassessments.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Riskassessment(element);
      });
      resolve(riskassessments);
    }).catch(_reject);
  });
