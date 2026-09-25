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

let getResearchsubject = (base_version) => {
  return resolveSchema(base_version, 'Researchsubject');
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

  // Researchsubject search params
  let date = args['date'];
  let identifier = args['identifier'];
  let individual = args['individual'];
  let patient = args['patient'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
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

  if (individual) {
    query.individual = stringQueryBuilder(individual);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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

  // Researchsubject search params for DSTU2
  let date = args['date'];
  let identifier = args['identifier'];
  let individual = args['individual'];
  let patient = args['patient'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
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

  if (individual) {
    query.individual = stringQueryBuilder(individual);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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
  logger.info('Researchsubject >>> search');

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
  let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${base_version}`);
  let Researchsubject = getResearchsubject(base_version);

  try {
    // Query our collection for this researchsubject
    const cursor = collection.find(query);
    const researchsubjects = await cursor.toArray();

    researchsubjects.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Researchsubject(element);
    });

    return toSearchBundle(researchsubjects);
  } catch (err) {
    logger.error('Error with Researchsubject.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Researchsubject >>> searchById');

  let { base_version, id } = args;
  let Researchsubject = getResearchsubject(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${base_version}`);

  try {
    // Query our collection for this researchsubject
    const researchsubject = await collection.findOne({ id: id.toString() });

    if (researchsubject) {
      delete researchsubject._id;
      return new Researchsubject(researchsubject);
    }
    return null;
  } catch (err) {
    logger.error('Error with Researchsubject.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchsubject >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${base_version}`);

    // Get current record
    let Researchsubject = getResearchsubject(base_version);
    let researchsubject = new Researchsubject(resource);
    delete researchsubject._id;

    // If no resource ID was provided, generate one.
    let id = researchsubject.id || getUuid();
    if (!researchsubject.id) {
      researchsubject.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    researchsubject.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(researchsubject));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Researchsubject created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchsubject >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${base_version}`);

    // Get current record
    let Researchsubject = getResearchsubject(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Researchsubject Class
    let researchsubject = new Researchsubject(resource);
    delete researchsubject._id;
    researchsubject.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(researchsubject));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Researchsubject updated with id: ' + id);
      resolve({
        id: researchsubject.id,
        created: false,
        resource_version: researchsubject.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchsubject >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Researchsubject deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchsubject >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Researchsubject = getResearchsubject(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${base_version}`);

    // Query our collection for this researchsubject with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((researchsubject) => {
      if (researchsubject) {
        delete researchsubject._id;
        resolve(new Researchsubject(researchsubject));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchsubject >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let identifier = args['identifier'];
    let individual = args['individual'];
    let patient = args['patient'];
    let status = args['status'];

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
    let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${base_version}`);
    let Researchsubject = getResearchsubject(base_version);

    // Query our collection for researchsubject history
    collection.find(query).toArray().then((researchsubjects) => {
      researchsubjects.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Researchsubject(element);
      });
      resolve(researchsubjects);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchsubject >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let identifier = args['identifier'];
    let individual = args['individual'];
    let patient = args['patient'];
    let status = args['status'];

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
    let collection = db.collection(`${COLLECTION.RESEARCHSUBJECT}_${base_version}`);
    let Researchsubject = getResearchsubject(base_version);

    // Query our collection for researchsubject history by id
    collection.find(query).toArray().then((researchsubjects) => {
      researchsubjects.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Researchsubject(element);
      });
      resolve(researchsubjects);
    }).catch(_reject);
  });
