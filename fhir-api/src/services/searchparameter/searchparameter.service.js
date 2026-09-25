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

let getSearchparameter = (base_version) => {
  return resolveSchema(base_version, 'Searchparameter');
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

  // Searchparameter search params
  let base = args['base'];
  let code = args['code'];
  let component = args['component'];
  let date = args['date'];
  let derived_from = args['derived_from'];
  let description = args['description'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let status = args['status'];
  let target = args['target'];
  let type = args['type'];
  let url = args['url'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (base) {
    query.base = stringQueryBuilder(base);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (component) {
    query.component = stringQueryBuilder(component);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (derived_from) {
    query.derived_from = stringQueryBuilder(derived_from);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
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

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (target) {
    query.target = stringQueryBuilder(target);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
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

  // Searchparameter search params for DSTU2
  let base = args['base'];
  let code = args['code'];
  let component = args['component'];
  let date = args['date'];
  let derived_from = args['derived_from'];
  let description = args['description'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let status = args['status'];
  let target = args['target'];
  let type = args['type'];
  let url = args['url'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (base) {
    query.base = stringQueryBuilder(base);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (component) {
    query.component = stringQueryBuilder(component);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (derived_from) {
    query.derived_from = stringQueryBuilder(derived_from);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
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

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (target) {
    query.target = stringQueryBuilder(target);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
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
  logger.info('Searchparameter >>> search');

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
  let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${base_version}`);
  let Searchparameter = getSearchparameter(base_version);

  try {
    // Query our collection for this searchparameter
    const cursor = collection.find(query);
    const searchparameters = await cursor.toArray();

    searchparameters.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Searchparameter(element);
    });

    return toSearchBundle(searchparameters);
  } catch (err) {
    logger.error('Error with Searchparameter.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Searchparameter >>> searchById');

  let { base_version, id } = args;
  let Searchparameter = getSearchparameter(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${base_version}`);

  try {
    // Query our collection for this searchparameter
    const searchparameter = await collection.findOne({ id: id.toString() });

    if (searchparameter) {
      delete searchparameter._id;
      return new Searchparameter(searchparameter);
    }
    return null;
  } catch (err) {
    logger.error('Error with Searchparameter.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Searchparameter >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${base_version}`);

    // Get current record
    let Searchparameter = getSearchparameter(base_version);
    let searchparameter = new Searchparameter(resource);
    delete searchparameter._id;

    // If no resource ID was provided, generate one.
    let id = searchparameter.id || getUuid();
    if (!searchparameter.id) {
      searchparameter.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    searchparameter.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(searchparameter));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Searchparameter created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Searchparameter >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${base_version}`);

    // Get current record
    let Searchparameter = getSearchparameter(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Searchparameter Class
    let searchparameter = new Searchparameter(resource);
    delete searchparameter._id;
    searchparameter.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(searchparameter));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Searchparameter updated with id: ' + id);
      resolve({
        id: searchparameter.id,
        created: false,
        resource_version: searchparameter.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Searchparameter >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Searchparameter deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Searchparameter >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Searchparameter = getSearchparameter(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${base_version}`);

    // Query our collection for this searchparameter with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((searchparameter) => {
      if (searchparameter) {
        delete searchparameter._id;
        resolve(new Searchparameter(searchparameter));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Searchparameter >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let base = args['base'];
    let code = args['code'];
    let component = args['component'];
    let date = args['date'];
    let derived_from = args['derived_from'];
    let description = args['description'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let status = args['status'];
    let target = args['target'];
    let type = args['type'];
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
    let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${base_version}`);
    let Searchparameter = getSearchparameter(base_version);

    // Query our collection for searchparameter history
    collection.find(query).toArray().then((searchparameters) => {
      searchparameters.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Searchparameter(element);
      });
      resolve(searchparameters);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Searchparameter >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let base = args['base'];
    let code = args['code'];
    let component = args['component'];
    let date = args['date'];
    let derived_from = args['derived_from'];
    let description = args['description'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let status = args['status'];
    let target = args['target'];
    let type = args['type'];
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
    let collection = db.collection(`${COLLECTION.SEARCHPARAMETER}_${base_version}`);
    let Searchparameter = getSearchparameter(base_version);

    // Query our collection for searchparameter history by id
    collection.find(query).toArray().then((searchparameters) => {
      searchparameters.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Searchparameter(element);
      });
      resolve(searchparameters);
    }).catch(_reject);
  });
