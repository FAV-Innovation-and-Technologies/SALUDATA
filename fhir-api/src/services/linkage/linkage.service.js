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

let getLinkage = (base_version) => {
  return resolveSchema(base_version, 'Linkage');
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

  // Linkage search params
  let author = args['author'];
  let item = args['item'];
  let source = args['source'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (item) {
    query.item = stringQueryBuilder(item);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
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

  // Linkage search params for DSTU2
  let author = args['author'];
  let item = args['item'];
  let source = args['source'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (item) {
    query.item = stringQueryBuilder(item);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Linkage >>> search');

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
  let collection = db.collection(`${COLLECTION.LINKAGE}_${base_version}`);
  let Linkage = getLinkage(base_version);

  try {
    // Query our collection for this linkage
    const cursor = collection.find(query);
    const linkages = await cursor.toArray();

    linkages.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Linkage(element);
    });

    return toSearchBundle(linkages);
  } catch (err) {
    logger.error('Error with Linkage.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Linkage >>> searchById');

  let { base_version, id } = args;
  let Linkage = getLinkage(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.LINKAGE}_${base_version}`);

  try {
    // Query our collection for this linkage
    const linkage = await collection.findOne({ id: id.toString() });

    if (linkage) {
      delete linkage._id;
      return new Linkage(linkage);
    }
    return null;
  } catch (err) {
    logger.error('Error with Linkage.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Linkage >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LINKAGE}_${base_version}`);

    // Get current record
    let Linkage = getLinkage(base_version);
    let linkage = new Linkage(resource);
    delete linkage._id;

    // If no resource ID was provided, generate one.
    let id = linkage.id || getUuid();
    if (!linkage.id) {
      linkage.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    linkage.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(linkage));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Linkage created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Linkage >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LINKAGE}_${base_version}`);

    // Get current record
    let Linkage = getLinkage(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Linkage Class
    let linkage = new Linkage(resource);
    delete linkage._id;
    linkage.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(linkage));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Linkage updated with id: ' + id);
      resolve({
        id: linkage.id,
        created: false,
        resource_version: linkage.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Linkage >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LINKAGE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Linkage deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Linkage >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Linkage = getLinkage(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LINKAGE}_${base_version}`);

    // Query our collection for this linkage with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((linkage) => {
      if (linkage) {
        delete linkage._id;
        resolve(new Linkage(linkage));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Linkage >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let item = args['item'];
    let source = args['source'];

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
    let collection = db.collection(`${COLLECTION.LINKAGE}_${base_version}`);
    let Linkage = getLinkage(base_version);

    // Query our collection for linkage history
    collection.find(query).toArray().then((linkages) => {
      linkages.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Linkage(element);
      });
      resolve(linkages);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Linkage >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let item = args['item'];
    let source = args['source'];

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
    let collection = db.collection(`${COLLECTION.LINKAGE}_${base_version}`);
    let Linkage = getLinkage(base_version);

    // Query our collection for linkage history by id
    collection.find(query).toArray().then((linkages) => {
      linkages.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Linkage(element);
      });
      resolve(linkages);
    }).catch(_reject);
  });
