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

let getConceptmap = (base_version) => {
  return resolveSchema(base_version, 'Conceptmap');
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

  // Conceptmap search params
  let date = args['date'];
  let dependson = args['dependson'];
  let description = args['description'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let other = args['other'];
  let product = args['product'];
  let publisher = args['publisher'];
  let source = args['source'];
  let source_code = args['source_code'];
  let source_system = args['source_system'];
  let source_uri = args['source_uri'];
  let status = args['status'];
  let target = args['target'];
  let target_code = args['target_code'];
  let target_system = args['target_system'];
  let target_uri = args['target_uri'];
  let title = args['title'];
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

  if (dependson) {
    query.dependson = stringQueryBuilder(dependson);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (other) {
    query.other = stringQueryBuilder(other);
  }

  if (product) {
    query.product = stringQueryBuilder(product);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (source_code) {
    query.source_code = stringQueryBuilder(source_code);
  }

  if (source_system) {
    query.source_system = stringQueryBuilder(source_system);
  }

  if (source_uri) {
    query.source_uri = stringQueryBuilder(source_uri);
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

  if (target_code) {
    query.target_code = stringQueryBuilder(target_code);
  }

  if (target_system) {
    query.target_system = stringQueryBuilder(target_system);
  }

  if (target_uri) {
    query.target_uri = stringQueryBuilder(target_uri);
  }

  if (title) {
    query.title = stringQueryBuilder(title);
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

  // Conceptmap search params for DSTU2
  let date = args['date'];
  let dependson = args['dependson'];
  let description = args['description'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let other = args['other'];
  let product = args['product'];
  let publisher = args['publisher'];
  let source = args['source'];
  let source_code = args['source_code'];
  let source_system = args['source_system'];
  let source_uri = args['source_uri'];
  let status = args['status'];
  let target = args['target'];
  let target_code = args['target_code'];
  let target_system = args['target_system'];
  let target_uri = args['target_uri'];
  let title = args['title'];
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

  if (dependson) {
    query.dependson = stringQueryBuilder(dependson);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (other) {
    query.other = stringQueryBuilder(other);
  }

  if (product) {
    query.product = stringQueryBuilder(product);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (source_code) {
    query.source_code = stringQueryBuilder(source_code);
  }

  if (source_system) {
    query.source_system = stringQueryBuilder(source_system);
  }

  if (source_uri) {
    query.source_uri = stringQueryBuilder(source_uri);
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

  if (target_code) {
    query.target_code = stringQueryBuilder(target_code);
  }

  if (target_system) {
    query.target_system = stringQueryBuilder(target_system);
  }

  if (target_uri) {
    query.target_uri = stringQueryBuilder(target_uri);
  }

  if (title) {
    query.title = stringQueryBuilder(title);
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
  logger.info('Conceptmap >>> search');

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
  let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${base_version}`);
  let Conceptmap = getConceptmap(base_version);

  try {
    // Query our collection for this conceptmap
    const cursor = collection.find(query);
    const conceptmaps = await cursor.toArray();

    conceptmaps.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Conceptmap(element);
    });

    return toSearchBundle(conceptmaps);
  } catch (err) {
    logger.error('Error with Conceptmap.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Conceptmap >>> searchById');

  let { base_version, id } = args;
  let Conceptmap = getConceptmap(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${base_version}`);

  try {
    // Query our collection for this conceptmap
    const conceptmap = await collection.findOne({ id: id.toString() });

    if (conceptmap) {
      delete conceptmap._id;
      return new Conceptmap(conceptmap);
    }
    return null;
  } catch (err) {
    logger.error('Error with Conceptmap.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Conceptmap >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${base_version}`);

    // Get current record
    let Conceptmap = getConceptmap(base_version);
    let conceptmap = new Conceptmap(resource);
    delete conceptmap._id;

    // If no resource ID was provided, generate one.
    let id = conceptmap.id || getUuid();
    if (!conceptmap.id) {
      conceptmap.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    conceptmap.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(conceptmap));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Conceptmap created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Conceptmap >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${base_version}`);

    // Get current record
    let Conceptmap = getConceptmap(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Conceptmap Class
    let conceptmap = new Conceptmap(resource);
    delete conceptmap._id;
    conceptmap.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(conceptmap));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Conceptmap updated with id: ' + id);
      resolve({
        id: conceptmap.id,
        created: false,
        resource_version: conceptmap.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Conceptmap >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Conceptmap deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Conceptmap >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Conceptmap = getConceptmap(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${base_version}`);

    // Query our collection for this conceptmap with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((conceptmap) => {
      if (conceptmap) {
        delete conceptmap._id;
        resolve(new Conceptmap(conceptmap));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Conceptmap >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dependson = args['dependson'];
    let description = args['description'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let other = args['other'];
    let product = args['product'];
    let publisher = args['publisher'];
    let source = args['source'];
    let source_code = args['source_code'];
    let source_system = args['source_system'];
    let source_uri = args['source_uri'];
    let status = args['status'];
    let target = args['target'];
    let target_code = args['target_code'];
    let target_system = args['target_system'];
    let target_uri = args['target_uri'];
    let title = args['title'];
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
    let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${base_version}`);
    let Conceptmap = getConceptmap(base_version);

    // Query our collection for conceptmap history
    collection.find(query).toArray().then((conceptmaps) => {
      conceptmaps.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Conceptmap(element);
      });
      resolve(conceptmaps);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Conceptmap >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dependson = args['dependson'];
    let description = args['description'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let other = args['other'];
    let product = args['product'];
    let publisher = args['publisher'];
    let source = args['source'];
    let source_code = args['source_code'];
    let source_system = args['source_system'];
    let source_uri = args['source_uri'];
    let status = args['status'];
    let target = args['target'];
    let target_code = args['target_code'];
    let target_system = args['target_system'];
    let target_uri = args['target_uri'];
    let title = args['title'];
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
    let collection = db.collection(`${COLLECTION.CONCEPTMAP}_${base_version}`);
    let Conceptmap = getConceptmap(base_version);

    // Query our collection for conceptmap history by id
    collection.find(query).toArray().then((conceptmaps) => {
      conceptmaps.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Conceptmap(element);
      });
      resolve(conceptmaps);
    }).catch(_reject);
  });
