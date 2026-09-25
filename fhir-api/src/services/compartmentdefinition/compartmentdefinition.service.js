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

let getCompartmentdefinition = (base_version) => {
  return resolveSchema(base_version, 'Compartmentdefinition');
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

  // Compartmentdefinition search params
  let code = args['code'];
  let date = args['date'];
  let description = args['description'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let resource = args['resource'];
  let status = args['status'];
  let title = args['title'];
  let url = args['url'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (resource) {
    query.resource = stringQueryBuilder(resource);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
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

  // Compartmentdefinition search params for DSTU2
  let code = args['code'];
  let date = args['date'];
  let description = args['description'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let resource = args['resource'];
  let status = args['status'];
  let title = args['title'];
  let url = args['url'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (resource) {
    query.resource = stringQueryBuilder(resource);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Compartmentdefinition >>> search');

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
  let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${base_version}`);
  let Compartmentdefinition = getCompartmentdefinition(base_version);

  try {
    // Query our collection for this compartmentdefinition
    const cursor = collection.find(query);
    const compartmentdefinitions = await cursor.toArray();

    compartmentdefinitions.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Compartmentdefinition(element);
    });

    return toSearchBundle(compartmentdefinitions);
  } catch (err) {
    logger.error('Error with Compartmentdefinition.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Compartmentdefinition >>> searchById');

  let { base_version, id } = args;
  let Compartmentdefinition = getCompartmentdefinition(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${base_version}`);

  try {
    // Query our collection for this compartmentdefinition
    const compartmentdefinition = await collection.findOne({ id: id.toString() });

    if (compartmentdefinition) {
      delete compartmentdefinition._id;
      return new Compartmentdefinition(compartmentdefinition);
    }
    return null;
  } catch (err) {
    logger.error('Error with Compartmentdefinition.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Compartmentdefinition >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${base_version}`);

    // Get current record
    let Compartmentdefinition = getCompartmentdefinition(base_version);
    let compartmentdefinition = new Compartmentdefinition(resource);
    delete compartmentdefinition._id;

    // If no resource ID was provided, generate one.
    let id = compartmentdefinition.id || getUuid();
    if (!compartmentdefinition.id) {
      compartmentdefinition.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    compartmentdefinition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(compartmentdefinition));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Compartmentdefinition created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Compartmentdefinition >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${base_version}`);

    // Get current record
    let Compartmentdefinition = getCompartmentdefinition(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Compartmentdefinition Class
    let compartmentdefinition = new Compartmentdefinition(resource);
    delete compartmentdefinition._id;
    compartmentdefinition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(compartmentdefinition));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Compartmentdefinition updated with id: ' + id);
      resolve({
        id: compartmentdefinition.id,
        created: false,
        resource_version: compartmentdefinition.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Compartmentdefinition >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Compartmentdefinition deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Compartmentdefinition >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Compartmentdefinition = getCompartmentdefinition(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${base_version}`);

    // Query our collection for this compartmentdefinition with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((compartmentdefinition) => {
      if (compartmentdefinition) {
        delete compartmentdefinition._id;
        resolve(new Compartmentdefinition(compartmentdefinition));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Compartmentdefinition >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let date = args['date'];
    let description = args['description'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let resource = args['resource'];
    let status = args['status'];
    let title = args['title'];
    let url = args['url'];

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
    let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${base_version}`);
    let Compartmentdefinition = getCompartmentdefinition(base_version);

    // Query our collection for compartmentdefinition history
    collection.find(query).toArray().then((compartmentdefinitions) => {
      compartmentdefinitions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Compartmentdefinition(element);
      });
      resolve(compartmentdefinitions);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Compartmentdefinition >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let date = args['date'];
    let description = args['description'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let resource = args['resource'];
    let status = args['status'];
    let title = args['title'];
    let url = args['url'];

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
    let collection = db.collection(`${COLLECTION.COMPARTMENTDEFINITION}_${base_version}`);
    let Compartmentdefinition = getCompartmentdefinition(base_version);

    // Query our collection for compartmentdefinition history by id
    collection.find(query).toArray().then((compartmentdefinitions) => {
      compartmentdefinitions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Compartmentdefinition(element);
      });
      resolve(compartmentdefinitions);
    }).catch(_reject);
  });
