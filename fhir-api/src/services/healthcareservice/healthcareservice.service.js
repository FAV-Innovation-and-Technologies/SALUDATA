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

let getHealthcareservice = (base_version) => {
  return resolveSchema(base_version, 'Healthcareservice');
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

  // Healthcareservice search params
  let active = args['active'];
  let category = args['category'];
  let characteristic = args['characteristic'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let location = args['location'];
  let name = args['name'];
  let organization = args['organization'];
  let programname = args['programname'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (active) {
    query.active = stringQueryBuilder(active);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (characteristic) {
    query.characteristic = stringQueryBuilder(characteristic);
  }

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (programname) {
    query.programname = stringQueryBuilder(programname);
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

  // Healthcareservice search params for DSTU2
  let active = args['active'];
  let category = args['category'];
  let characteristic = args['characteristic'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let location = args['location'];
  let name = args['name'];
  let organization = args['organization'];
  let programname = args['programname'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (active) {
    query.active = stringQueryBuilder(active);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (characteristic) {
    query.characteristic = stringQueryBuilder(characteristic);
  }

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (programname) {
    query.programname = stringQueryBuilder(programname);
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
  logger.info('Healthcareservice >>> search');

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
  let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${base_version}`);
  let Healthcareservice = getHealthcareservice(base_version);

  try {
    // Query our collection for this healthcareservice
    const cursor = collection.find(query);
    const healthcareservices = await cursor.toArray();

    healthcareservices.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Healthcareservice(element);
    });

    return toSearchBundle(healthcareservices);
  } catch (err) {
    logger.error('Error with Healthcareservice.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Healthcareservice >>> searchById');

  let { base_version, id } = args;
  let Healthcareservice = getHealthcareservice(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${base_version}`);

  try {
    // Query our collection for this healthcareservice
    const healthcareservice = await collection.findOne({ id: id.toString() });

    if (healthcareservice) {
      delete healthcareservice._id;
      return new Healthcareservice(healthcareservice);
    }
    return null;
  } catch (err) {
    logger.error('Error with Healthcareservice.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Healthcareservice >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${base_version}`);

    // Get current record
    let Healthcareservice = getHealthcareservice(base_version);
    let healthcareservice = new Healthcareservice(resource);
    delete healthcareservice._id;

    // If no resource ID was provided, generate one.
    let id = healthcareservice.id || getUuid();
    if (!healthcareservice.id) {
      healthcareservice.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    healthcareservice.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(healthcareservice));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Healthcareservice created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Healthcareservice >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${base_version}`);

    // Get current record
    let Healthcareservice = getHealthcareservice(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Healthcareservice Class
    let healthcareservice = new Healthcareservice(resource);
    delete healthcareservice._id;
    healthcareservice.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(healthcareservice));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Healthcareservice updated with id: ' + id);
      resolve({
        id: healthcareservice.id,
        created: false,
        resource_version: healthcareservice.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Healthcareservice >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Healthcareservice deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Healthcareservice >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Healthcareservice = getHealthcareservice(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${base_version}`);

    // Query our collection for this healthcareservice with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((healthcareservice) => {
      if (healthcareservice) {
        delete healthcareservice._id;
        resolve(new Healthcareservice(healthcareservice));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Healthcareservice >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let active = args['active'];
    let category = args['category'];
    let characteristic = args['characteristic'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let location = args['location'];
    let name = args['name'];
    let organization = args['organization'];
    let programname = args['programname'];
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
    let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${base_version}`);
    let Healthcareservice = getHealthcareservice(base_version);

    // Query our collection for healthcareservice history
    collection.find(query).toArray().then((healthcareservices) => {
      healthcareservices.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Healthcareservice(element);
      });
      resolve(healthcareservices);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Healthcareservice >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let active = args['active'];
    let category = args['category'];
    let characteristic = args['characteristic'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let location = args['location'];
    let name = args['name'];
    let organization = args['organization'];
    let programname = args['programname'];
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
    let collection = db.collection(`${COLLECTION.HEALTHCARESERVICE}_${base_version}`);
    let Healthcareservice = getHealthcareservice(base_version);

    // Query our collection for healthcareservice history by id
    collection.find(query).toArray().then((healthcareservices) => {
      healthcareservices.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Healthcareservice(element);
      });
      resolve(healthcareservices);
    }).catch(_reject);
  });
