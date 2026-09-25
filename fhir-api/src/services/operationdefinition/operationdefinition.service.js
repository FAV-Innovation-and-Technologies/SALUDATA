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

let getOperationdefinition = (base_version) => {
  return resolveSchema(base_version, 'Operationdefinition');
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

  // Operationdefinition search params
  let base = args['base'];
  let code = args['code'];
  let date = args['date'];
  let description = args['description'];
  let instance = args['instance'];
  let jurisdiction = args['jurisdiction'];
  let kind = args['kind'];
  let name = args['name'];
  let param_profile = args['param_profile'];
  let publisher = args['publisher'];
  let status = args['status'];
  let system = args['system'];
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

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (instance) {
    query.instance = stringQueryBuilder(instance);
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (kind) {
    query.kind = stringQueryBuilder(kind);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (param_profile) {
    query.param_profile = stringQueryBuilder(param_profile);
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

  if (system) {
    query.system = stringQueryBuilder(system);
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

  // Operationdefinition search params for DSTU2
  let base = args['base'];
  let code = args['code'];
  let date = args['date'];
  let description = args['description'];
  let instance = args['instance'];
  let jurisdiction = args['jurisdiction'];
  let kind = args['kind'];
  let name = args['name'];
  let param_profile = args['param_profile'];
  let publisher = args['publisher'];
  let status = args['status'];
  let system = args['system'];
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

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (instance) {
    query.instance = stringQueryBuilder(instance);
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (kind) {
    query.kind = stringQueryBuilder(kind);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (param_profile) {
    query.param_profile = stringQueryBuilder(param_profile);
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

  if (system) {
    query.system = stringQueryBuilder(system);
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
  logger.info('Operationdefinition >>> search');

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
  let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${base_version}`);
  let Operationdefinition = getOperationdefinition(base_version);

  try {
    // Query our collection for this operationdefinition
    const cursor = collection.find(query);
    const operationdefinitions = await cursor.toArray();

    operationdefinitions.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Operationdefinition(element);
    });

    return toSearchBundle(operationdefinitions);
  } catch (err) {
    logger.error('Error with Operationdefinition.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Operationdefinition >>> searchById');

  let { base_version, id } = args;
  let Operationdefinition = getOperationdefinition(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${base_version}`);

  try {
    // Query our collection for this operationdefinition
    const operationdefinition = await collection.findOne({ id: id.toString() });

    if (operationdefinition) {
      delete operationdefinition._id;
      return new Operationdefinition(operationdefinition);
    }
    return null;
  } catch (err) {
    logger.error('Error with Operationdefinition.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Operationdefinition >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${base_version}`);

    // Get current record
    let Operationdefinition = getOperationdefinition(base_version);
    let operationdefinition = new Operationdefinition(resource);
    delete operationdefinition._id;

    // If no resource ID was provided, generate one.
    let id = operationdefinition.id || getUuid();
    if (!operationdefinition.id) {
      operationdefinition.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    operationdefinition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(operationdefinition));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Operationdefinition created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Operationdefinition >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${base_version}`);

    // Get current record
    let Operationdefinition = getOperationdefinition(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Operationdefinition Class
    let operationdefinition = new Operationdefinition(resource);
    delete operationdefinition._id;
    operationdefinition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(operationdefinition));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Operationdefinition updated with id: ' + id);
      resolve({
        id: operationdefinition.id,
        created: false,
        resource_version: operationdefinition.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Operationdefinition >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Operationdefinition deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Operationdefinition >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Operationdefinition = getOperationdefinition(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${base_version}`);

    // Query our collection for this operationdefinition with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((operationdefinition) => {
      if (operationdefinition) {
        delete operationdefinition._id;
        resolve(new Operationdefinition(operationdefinition));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Operationdefinition >>> history');

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
    let date = args['date'];
    let description = args['description'];
    let instance = args['instance'];
    let jurisdiction = args['jurisdiction'];
    let kind = args['kind'];
    let name = args['name'];
    let param_profile = args['param_profile'];
    let publisher = args['publisher'];
    let status = args['status'];
    let system = args['system'];
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
    let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${base_version}`);
    let Operationdefinition = getOperationdefinition(base_version);

    // Query our collection for operationdefinition history
    collection.find(query).toArray().then((operationdefinitions) => {
      operationdefinitions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Operationdefinition(element);
      });
      resolve(operationdefinitions);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Operationdefinition >>> historyById');

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
    let date = args['date'];
    let description = args['description'];
    let instance = args['instance'];
    let jurisdiction = args['jurisdiction'];
    let kind = args['kind'];
    let name = args['name'];
    let param_profile = args['param_profile'];
    let publisher = args['publisher'];
    let status = args['status'];
    let system = args['system'];
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
    let collection = db.collection(`${COLLECTION.OPERATIONDEFINITION}_${base_version}`);
    let Operationdefinition = getOperationdefinition(base_version);

    // Query our collection for operationdefinition history by id
    collection.find(query).toArray().then((operationdefinitions) => {
      operationdefinitions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Operationdefinition(element);
      });
      resolve(operationdefinitions);
    }).catch(_reject);
  });
