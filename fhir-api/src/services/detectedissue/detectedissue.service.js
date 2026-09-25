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

let getDetectedissue = (base_version) => {
  return resolveSchema(base_version, 'Detectedissue');
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

  // Detectedissue search params
  let author = args['author'];
  let category = args['category'];
  let date = args['date'];
  let identifier = args['identifier'];
  let implicated = args['implicated'];
  let patient = args['patient'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (implicated) {
    query.implicated = stringQueryBuilder(implicated);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
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

  // Detectedissue search params for DSTU2
  let author = args['author'];
  let category = args['category'];
  let date = args['date'];
  let identifier = args['identifier'];
  let implicated = args['implicated'];
  let patient = args['patient'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (implicated) {
    query.implicated = stringQueryBuilder(implicated);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
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
  logger.info('Detectedissue >>> search');

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
  let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${base_version}`);
  let Detectedissue = getDetectedissue(base_version);

  try {
    // Query our collection for this detectedissue
    const cursor = collection.find(query);
    const detectedissues = await cursor.toArray();

    detectedissues.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Detectedissue(element);
    });

    return toSearchBundle(detectedissues);
  } catch (err) {
    logger.error('Error with Detectedissue.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Detectedissue >>> searchById');

  let { base_version, id } = args;
  let Detectedissue = getDetectedissue(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${base_version}`);

  try {
    // Query our collection for this detectedissue
    const detectedissue = await collection.findOne({ id: id.toString() });

    if (detectedissue) {
      delete detectedissue._id;
      return new Detectedissue(detectedissue);
    }
    return null;
  } catch (err) {
    logger.error('Error with Detectedissue.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Detectedissue >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${base_version}`);

    // Get current record
    let Detectedissue = getDetectedissue(base_version);
    let detectedissue = new Detectedissue(resource);
    delete detectedissue._id;

    // If no resource ID was provided, generate one.
    let id = detectedissue.id || getUuid();
    if (!detectedissue.id) {
      detectedissue.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    detectedissue.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(detectedissue));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Detectedissue created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Detectedissue >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${base_version}`);

    // Get current record
    let Detectedissue = getDetectedissue(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Detectedissue Class
    let detectedissue = new Detectedissue(resource);
    delete detectedissue._id;
    detectedissue.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(detectedissue));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Detectedissue updated with id: ' + id);
      resolve({
        id: detectedissue.id,
        created: false,
        resource_version: detectedissue.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Detectedissue >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Detectedissue deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Detectedissue >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Detectedissue = getDetectedissue(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${base_version}`);

    // Query our collection for this detectedissue with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((detectedissue) => {
      if (detectedissue) {
        delete detectedissue._id;
        resolve(new Detectedissue(detectedissue));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Detectedissue >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let category = args['category'];
    let date = args['date'];
    let identifier = args['identifier'];
    let implicated = args['implicated'];
    let patient = args['patient'];

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
    let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${base_version}`);
    let Detectedissue = getDetectedissue(base_version);

    // Query our collection for detectedissue history
    collection.find(query).toArray().then((detectedissues) => {
      detectedissues.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Detectedissue(element);
      });
      resolve(detectedissues);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Detectedissue >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let category = args['category'];
    let date = args['date'];
    let identifier = args['identifier'];
    let implicated = args['implicated'];
    let patient = args['patient'];

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
    let collection = db.collection(`${COLLECTION.DETECTEDISSUE}_${base_version}`);
    let Detectedissue = getDetectedissue(base_version);

    // Query our collection for detectedissue history by id
    collection.find(query).toArray().then((detectedissues) => {
      detectedissues.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Detectedissue(element);
      });
      resolve(detectedissues);
    }).catch(_reject);
  });
