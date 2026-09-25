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

let getTestreport = (base_version) => {
  return resolveSchema(base_version, 'Testreport');
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

  // Testreport search params
  let identifier = args['identifier'];
  let issued = args['issued'];
  let participant = args['participant'];
  let result = args['result'];
  let tester = args['tester'];
  let testscript = args['testscript'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (issued) {
    query.issued = stringQueryBuilder(issued);
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
  }

  if (result) {
    query.result = stringQueryBuilder(result);
  }

  if (tester) {
    query.tester = stringQueryBuilder(tester);
  }

  if (testscript) {
    query.testscript = stringQueryBuilder(testscript);
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

  // Testreport search params for DSTU2
  let identifier = args['identifier'];
  let issued = args['issued'];
  let participant = args['participant'];
  let result = args['result'];
  let tester = args['tester'];
  let testscript = args['testscript'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (issued) {
    query.issued = stringQueryBuilder(issued);
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
  }

  if (result) {
    query.result = stringQueryBuilder(result);
  }

  if (tester) {
    query.tester = stringQueryBuilder(tester);
  }

  if (testscript) {
    query.testscript = stringQueryBuilder(testscript);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Testreport >>> search');

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
  let collection = db.collection(`${COLLECTION.TESTREPORT}_${base_version}`);
  let Testreport = getTestreport(base_version);

  try {
    // Query our collection for this testreport
    const cursor = collection.find(query);
    const testreports = await cursor.toArray();

    testreports.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Testreport(element);
    });

    return toSearchBundle(testreports);
  } catch (err) {
    logger.error('Error with Testreport.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Testreport >>> searchById');

  let { base_version, id } = args;
  let Testreport = getTestreport(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.TESTREPORT}_${base_version}`);

  try {
    // Query our collection for this testreport
    const testreport = await collection.findOne({ id: id.toString() });

    if (testreport) {
      delete testreport._id;
      return new Testreport(testreport);
    }
    return null;
  } catch (err) {
    logger.error('Error with Testreport.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Testreport >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TESTREPORT}_${base_version}`);

    // Get current record
    let Testreport = getTestreport(base_version);
    let testreport = new Testreport(resource);
    delete testreport._id;

    // If no resource ID was provided, generate one.
    let id = testreport.id || getUuid();
    if (!testreport.id) {
      testreport.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    testreport.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(testreport));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Testreport created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Testreport >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TESTREPORT}_${base_version}`);

    // Get current record
    let Testreport = getTestreport(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Testreport Class
    let testreport = new Testreport(resource);
    delete testreport._id;
    testreport.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(testreport));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Testreport updated with id: ' + id);
      resolve({
        id: testreport.id,
        created: false,
        resource_version: testreport.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Testreport >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TESTREPORT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Testreport deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Testreport >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Testreport = getTestreport(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TESTREPORT}_${base_version}`);

    // Query our collection for this testreport with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((testreport) => {
      if (testreport) {
        delete testreport._id;
        resolve(new Testreport(testreport));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Testreport >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let issued = args['issued'];
    let participant = args['participant'];
    let result = args['result'];
    let tester = args['tester'];
    let testscript = args['testscript'];

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
    let collection = db.collection(`${COLLECTION.TESTREPORT}_${base_version}`);
    let Testreport = getTestreport(base_version);

    // Query our collection for testreport history
    collection.find(query).toArray().then((testreports) => {
      testreports.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Testreport(element);
      });
      resolve(testreports);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Testreport >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let identifier = args['identifier'];
    let issued = args['issued'];
    let participant = args['participant'];
    let result = args['result'];
    let tester = args['tester'];
    let testscript = args['testscript'];

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
    let collection = db.collection(`${COLLECTION.TESTREPORT}_${base_version}`);
    let Testreport = getTestreport(base_version);

    // Query our collection for testreport history by id
    collection.find(query).toArray().then((testreports) => {
      testreports.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Testreport(element);
      });
      resolve(testreports);
    }).catch(_reject);
  });
