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

let getImplementationguide = (base_version) => {
  return resolveSchema(base_version, 'Implementationguide');
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

  // Implementationguide search params
  let date = args['date'];
  let dependency = args['dependency'];
  let description = args['description'];
  let experimental = args['experimental'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let resource = args['resource'];
  let status = args['status'];
  let url = args['url'];
  let version = args['version'];

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

  if (dependency) {
    query.dependency = stringQueryBuilder(dependency);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (experimental) {
    query.experimental = stringQueryBuilder(experimental);
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (resource) {
    query.resource = stringQueryBuilder(resource);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (version) {
    query.version = stringQueryBuilder(version);
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

  // Implementationguide search params for DSTU2
  let date = args['date'];
  let dependency = args['dependency'];
  let description = args['description'];
  let experimental = args['experimental'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let resource = args['resource'];
  let status = args['status'];
  let url = args['url'];
  let version = args['version'];

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

  if (dependency) {
    query.dependency = stringQueryBuilder(dependency);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (experimental) {
    query.experimental = stringQueryBuilder(experimental);
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (resource) {
    query.resource = stringQueryBuilder(resource);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (version) {
    query.version = stringQueryBuilder(version);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Implementationguide >>> search');

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
  let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${base_version}`);
  let Implementationguide = getImplementationguide(base_version);

  try {
    // Query our collection for this implementationguide
    const cursor = collection.find(query);
    const implementationguides = await cursor.toArray();

    implementationguides.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Implementationguide(element);
    });

    return toSearchBundle(implementationguides);
  } catch (err) {
    logger.error('Error with Implementationguide.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Implementationguide >>> searchById');

  let { base_version, id } = args;
  let Implementationguide = getImplementationguide(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${base_version}`);

  try {
    // Query our collection for this implementationguide
    const implementationguide = await collection.findOne({ id: id.toString() });

    if (implementationguide) {
      delete implementationguide._id;
      return new Implementationguide(implementationguide);
    }
    return null;
  } catch (err) {
    logger.error('Error with Implementationguide.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Implementationguide >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${base_version}`);

    // Get current record
    let Implementationguide = getImplementationguide(base_version);
    let implementationguide = new Implementationguide(resource);
    delete implementationguide._id;

    // If no resource ID was provided, generate one.
    let id = implementationguide.id || getUuid();
    if (!implementationguide.id) {
      implementationguide.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    implementationguide.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(implementationguide));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Implementationguide created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Implementationguide >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${base_version}`);

    // Get current record
    let Implementationguide = getImplementationguide(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Implementationguide Class
    let implementationguide = new Implementationguide(resource);
    delete implementationguide._id;
    implementationguide.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(implementationguide));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Implementationguide updated with id: ' + id);
      resolve({
        id: implementationguide.id,
        created: false,
        resource_version: implementationguide.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Implementationguide >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Implementationguide deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Implementationguide >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Implementationguide = getImplementationguide(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${base_version}`);

    // Query our collection for this implementationguide with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((implementationguide) => {
      if (implementationguide) {
        delete implementationguide._id;
        resolve(new Implementationguide(implementationguide));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Implementationguide >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dependency = args['dependency'];
    let description = args['description'];
    let experimental = args['experimental'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let resource = args['resource'];
    let status = args['status'];
    let url = args['url'];
    let version = args['version'];

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
    let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${base_version}`);
    let Implementationguide = getImplementationguide(base_version);

    // Query our collection for implementationguide history
    collection.find(query).toArray().then((implementationguides) => {
      implementationguides.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Implementationguide(element);
      });
      resolve(implementationguides);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Implementationguide >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dependency = args['dependency'];
    let description = args['description'];
    let experimental = args['experimental'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let resource = args['resource'];
    let status = args['status'];
    let url = args['url'];
    let version = args['version'];

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
    let collection = db.collection(`${COLLECTION.IMPLEMENTATIONGUIDE}_${base_version}`);
    let Implementationguide = getImplementationguide(base_version);

    // Query our collection for implementationguide history by id
    collection.find(query).toArray().then((implementationguides) => {
      implementationguides.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Implementationguide(element);
      });
      resolve(implementationguides);
    }).catch(_reject);
  });
