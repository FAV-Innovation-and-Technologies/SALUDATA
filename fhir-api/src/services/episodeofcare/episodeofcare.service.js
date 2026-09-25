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

let getEpisodeofcare = (base_version) => {
  return resolveSchema(base_version, 'Episodeofcare');
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

  // Episodeofcare search params
  let care_manager = args['care_manager'];
  let condition = args['condition'];
  let date = args['date'];
  let identifier = args['identifier'];
  let incomingreferral = args['incomingreferral'];
  let organization = args['organization'];
  let patient = args['patient'];
  let status = args['status'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (care_manager) {
    query.care_manager = stringQueryBuilder(care_manager);
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

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (incomingreferral) {
    query.incomingreferral = stringQueryBuilder(incomingreferral);
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

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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

  // Episodeofcare search params for DSTU2
  let care_manager = args['care_manager'];
  let condition = args['condition'];
  let date = args['date'];
  let identifier = args['identifier'];
  let incomingreferral = args['incomingreferral'];
  let organization = args['organization'];
  let patient = args['patient'];
  let status = args['status'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (care_manager) {
    query.care_manager = stringQueryBuilder(care_manager);
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

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (incomingreferral) {
    query.incomingreferral = stringQueryBuilder(incomingreferral);
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

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Episodeofcare >>> search');

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
  let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${base_version}`);
  let Episodeofcare = getEpisodeofcare(base_version);

  try {
    // Query our collection for this episodeofcare
    const cursor = collection.find(query);
    const episodeofcares = await cursor.toArray();

    episodeofcares.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Episodeofcare(element);
    });

    return toSearchBundle(episodeofcares);
  } catch (err) {
    logger.error('Error with Episodeofcare.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Episodeofcare >>> searchById');

  let { base_version, id } = args;
  let Episodeofcare = getEpisodeofcare(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${base_version}`);

  try {
    // Query our collection for this episodeofcare
    const episodeofcare = await collection.findOne({ id: id.toString() });

    if (episodeofcare) {
      delete episodeofcare._id;
      return new Episodeofcare(episodeofcare);
    }
    return null;
  } catch (err) {
    logger.error('Error with Episodeofcare.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Episodeofcare >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${base_version}`);

    // Get current record
    let Episodeofcare = getEpisodeofcare(base_version);
    let episodeofcare = new Episodeofcare(resource);
    delete episodeofcare._id;

    // If no resource ID was provided, generate one.
    let id = episodeofcare.id || getUuid();
    if (!episodeofcare.id) {
      episodeofcare.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    episodeofcare.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(episodeofcare));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Episodeofcare created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Episodeofcare >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${base_version}`);

    // Get current record
    let Episodeofcare = getEpisodeofcare(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Episodeofcare Class
    let episodeofcare = new Episodeofcare(resource);
    delete episodeofcare._id;
    episodeofcare.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(episodeofcare));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Episodeofcare updated with id: ' + id);
      resolve({
        id: episodeofcare.id,
        created: false,
        resource_version: episodeofcare.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Episodeofcare >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Episodeofcare deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Episodeofcare >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Episodeofcare = getEpisodeofcare(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${base_version}`);

    // Query our collection for this episodeofcare with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((episodeofcare) => {
      if (episodeofcare) {
        delete episodeofcare._id;
        resolve(new Episodeofcare(episodeofcare));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Episodeofcare >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let care_manager = args['care_manager'];
    let condition = args['condition'];
    let date = args['date'];
    let identifier = args['identifier'];
    let incomingreferral = args['incomingreferral'];
    let organization = args['organization'];
    let patient = args['patient'];
    let status = args['status'];
    let type = args['type'];

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
    let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${base_version}`);
    let Episodeofcare = getEpisodeofcare(base_version);

    // Query our collection for episodeofcare history
    collection.find(query).toArray().then((episodeofcares) => {
      episodeofcares.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Episodeofcare(element);
      });
      resolve(episodeofcares);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Episodeofcare >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let care_manager = args['care_manager'];
    let condition = args['condition'];
    let date = args['date'];
    let identifier = args['identifier'];
    let incomingreferral = args['incomingreferral'];
    let organization = args['organization'];
    let patient = args['patient'];
    let status = args['status'];
    let type = args['type'];

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
    let collection = db.collection(`${COLLECTION.EPISODEOFCARE}_${base_version}`);
    let Episodeofcare = getEpisodeofcare(base_version);

    // Query our collection for episodeofcare history by id
    collection.find(query).toArray().then((episodeofcares) => {
      episodeofcares.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Episodeofcare(element);
      });
      resolve(episodeofcares);
    }).catch(_reject);
  });
