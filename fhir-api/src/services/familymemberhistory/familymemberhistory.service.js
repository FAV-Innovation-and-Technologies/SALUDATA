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

let getFamilymemberhistory = (base_version) => {
  return resolveSchema(base_version, 'Familymemberhistory');
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

  // Familymemberhistory search params
  let code = args['code'];
  let date = args['date'];
  let definition = args['definition'];
  let gender = args['gender'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let relationship = args['relationship'];
  let status = args['status'];

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

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (gender) {
    query.gender = stringQueryBuilder(gender);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
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

  if (relationship) {
    query.relationship = stringQueryBuilder(relationship);
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

  // Familymemberhistory search params for DSTU2
  let code = args['code'];
  let date = args['date'];
  let definition = args['definition'];
  let gender = args['gender'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let relationship = args['relationship'];
  let status = args['status'];

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

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (gender) {
    query.gender = stringQueryBuilder(gender);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
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

  if (relationship) {
    query.relationship = stringQueryBuilder(relationship);
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
  logger.info('Familymemberhistory >>> search');

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
  let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${base_version}`);
  let Familymemberhistory = getFamilymemberhistory(base_version);

  try {
    // Query our collection for this familymemberhistory
    const cursor = collection.find(query);
    const familymemberhistorys = await cursor.toArray();

    familymemberhistorys.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Familymemberhistory(element);
    });

    return toSearchBundle(familymemberhistorys);
  } catch (err) {
    logger.error('Error with Familymemberhistory.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Familymemberhistory >>> searchById');

  let { base_version, id } = args;
  let Familymemberhistory = getFamilymemberhistory(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${base_version}`);

  try {
    // Query our collection for this familymemberhistory
    const familymemberhistory = await collection.findOne({ id: id.toString() });

    if (familymemberhistory) {
      delete familymemberhistory._id;
      return new Familymemberhistory(familymemberhistory);
    }
    return null;
  } catch (err) {
    logger.error('Error with Familymemberhistory.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Familymemberhistory >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${base_version}`);

    // Get current record
    let Familymemberhistory = getFamilymemberhistory(base_version);
    let familymemberhistory = new Familymemberhistory(resource);
    delete familymemberhistory._id;

    // If no resource ID was provided, generate one.
    let id = familymemberhistory.id || getUuid();
    if (!familymemberhistory.id) {
      familymemberhistory.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    familymemberhistory.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(familymemberhistory));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Familymemberhistory created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Familymemberhistory >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${base_version}`);

    // Get current record
    let Familymemberhistory = getFamilymemberhistory(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Familymemberhistory Class
    let familymemberhistory = new Familymemberhistory(resource);
    delete familymemberhistory._id;
    familymemberhistory.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(familymemberhistory));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Familymemberhistory updated with id: ' + id);
      resolve({
        id: familymemberhistory.id,
        created: false,
        resource_version: familymemberhistory.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Familymemberhistory >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Familymemberhistory deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Familymemberhistory >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Familymemberhistory = getFamilymemberhistory(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${base_version}`);

    // Query our collection for this familymemberhistory with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((familymemberhistory) => {
      if (familymemberhistory) {
        delete familymemberhistory._id;
        resolve(new Familymemberhistory(familymemberhistory));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Familymemberhistory >>> history');

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
    let definition = args['definition'];
    let gender = args['gender'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let relationship = args['relationship'];
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
    let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${base_version}`);
    let Familymemberhistory = getFamilymemberhistory(base_version);

    // Query our collection for familymemberhistory history
    collection.find(query).toArray().then((familymemberhistorys) => {
      familymemberhistorys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Familymemberhistory(element);
      });
      resolve(familymemberhistorys);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Familymemberhistory >>> historyById');

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
    let definition = args['definition'];
    let gender = args['gender'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let relationship = args['relationship'];
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
    let collection = db.collection(`${COLLECTION.FAMILYMEMBERHISTORY}_${base_version}`);
    let Familymemberhistory = getFamilymemberhistory(base_version);

    // Query our collection for familymemberhistory history by id
    collection.find(query).toArray().then((familymemberhistorys) => {
      familymemberhistorys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Familymemberhistory(element);
      });
      resolve(familymemberhistorys);
    }).catch(_reject);
  });
