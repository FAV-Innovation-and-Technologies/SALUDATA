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

let getStructuredefinition = (base_version) => {
  return resolveSchema(base_version, 'Structuredefinition');
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

  // Structuredefinition search params
  let abstract = args['abstract'];
  let base = args['base'];
  let base_path = args['base_path'];
  let context_type = args['context_type'];
  let date = args['date'];
  let derivation = args['derivation'];
  let description = args['description'];
  let experimental = args['experimental'];
  let ext_context = args['ext_context'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let keyword = args['keyword'];
  let kind = args['kind'];
  let name = args['name'];
  let path = args['path'];
  let publisher = args['publisher'];
  let status = args['status'];
  let title = args['title'];
  let type = args['type'];
  let url = args['url'];
  let valueset = args['valueset'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (abstract) {
    query.abstract = stringQueryBuilder(abstract);
  }

  if (base) {
    query.base = stringQueryBuilder(base);
  }

  if (base_path) {
    query.base_path = stringQueryBuilder(base_path);
  }

  if (context_type) {
    let queryBuilder = tokenQueryBuilder(context_type, 'code', 'context_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (derivation) {
    query.derivation = stringQueryBuilder(derivation);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (experimental) {
    query.experimental = stringQueryBuilder(experimental);
  }

  if (ext_context) {
    query.ext_context = stringQueryBuilder(ext_context);
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

  if (keyword) {
    query.keyword = stringQueryBuilder(keyword);
  }

  if (kind) {
    query.kind = stringQueryBuilder(kind);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (path) {
    query.path = stringQueryBuilder(path);
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

  if (title) {
    query.title = stringQueryBuilder(title);
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

  if (valueset) {
    query.valueset = stringQueryBuilder(valueset);
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

  // Structuredefinition search params for DSTU2
  let abstract = args['abstract'];
  let base = args['base'];
  let base_path = args['base_path'];
  let context_type = args['context_type'];
  let date = args['date'];
  let derivation = args['derivation'];
  let description = args['description'];
  let experimental = args['experimental'];
  let ext_context = args['ext_context'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let keyword = args['keyword'];
  let kind = args['kind'];
  let name = args['name'];
  let path = args['path'];
  let publisher = args['publisher'];
  let status = args['status'];
  let title = args['title'];
  let type = args['type'];
  let url = args['url'];
  let valueset = args['valueset'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (abstract) {
    query.abstract = stringQueryBuilder(abstract);
  }

  if (base) {
    query.base = stringQueryBuilder(base);
  }

  if (base_path) {
    query.base_path = stringQueryBuilder(base_path);
  }

  if (context_type) {
    let queryBuilder = tokenQueryBuilder(context_type, 'code', 'context_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (derivation) {
    query.derivation = stringQueryBuilder(derivation);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (experimental) {
    query.experimental = stringQueryBuilder(experimental);
  }

  if (ext_context) {
    query.ext_context = stringQueryBuilder(ext_context);
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

  if (keyword) {
    query.keyword = stringQueryBuilder(keyword);
  }

  if (kind) {
    query.kind = stringQueryBuilder(kind);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (path) {
    query.path = stringQueryBuilder(path);
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

  if (title) {
    query.title = stringQueryBuilder(title);
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

  if (valueset) {
    query.valueset = stringQueryBuilder(valueset);
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
  logger.info('Structuredefinition >>> search');

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
  let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${base_version}`);
  let Structuredefinition = getStructuredefinition(base_version);

  try {
    // Query our collection for this structuredefinition
    const cursor = collection.find(query);
    const structuredefinitions = await cursor.toArray();

    structuredefinitions.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Structuredefinition(element);
    });

    return toSearchBundle(structuredefinitions);
  } catch (err) {
    logger.error('Error with Structuredefinition.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Structuredefinition >>> searchById');

  let { base_version, id } = args;
  let Structuredefinition = getStructuredefinition(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${base_version}`);

  try {
    // Query our collection for this structuredefinition
    const structuredefinition = await collection.findOne({ id: id.toString() });

    if (structuredefinition) {
      delete structuredefinition._id;
      return new Structuredefinition(structuredefinition);
    }
    return null;
  } catch (err) {
    logger.error('Error with Structuredefinition.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Structuredefinition >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${base_version}`);

    // Get current record
    let Structuredefinition = getStructuredefinition(base_version);
    let structuredefinition = new Structuredefinition(resource);
    delete structuredefinition._id;

    // If no resource ID was provided, generate one.
    let id = structuredefinition.id || getUuid();
    if (!structuredefinition.id) {
      structuredefinition.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    structuredefinition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(structuredefinition));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Structuredefinition created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Structuredefinition >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${base_version}`);

    // Get current record
    let Structuredefinition = getStructuredefinition(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Structuredefinition Class
    let structuredefinition = new Structuredefinition(resource);
    delete structuredefinition._id;
    structuredefinition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(structuredefinition));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Structuredefinition updated with id: ' + id);
      resolve({
        id: structuredefinition.id,
        created: false,
        resource_version: structuredefinition.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Structuredefinition >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Structuredefinition deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Structuredefinition >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Structuredefinition = getStructuredefinition(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${base_version}`);

    // Query our collection for this structuredefinition with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((structuredefinition) => {
      if (structuredefinition) {
        delete structuredefinition._id;
        resolve(new Structuredefinition(structuredefinition));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Structuredefinition >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let abstract = args['abstract'];
    let base = args['base'];
    let base_path = args['base_path'];
    let context_type = args['context_type'];
    let date = args['date'];
    let derivation = args['derivation'];
    let description = args['description'];
    let experimental = args['experimental'];
    let ext_context = args['ext_context'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let keyword = args['keyword'];
    let kind = args['kind'];
    let name = args['name'];
    let path = args['path'];
    let publisher = args['publisher'];
    let status = args['status'];
    let title = args['title'];
    let type = args['type'];
    let url = args['url'];
    let valueset = args['valueset'];
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
    let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${base_version}`);
    let Structuredefinition = getStructuredefinition(base_version);

    // Query our collection for structuredefinition history
    collection.find(query).toArray().then((structuredefinitions) => {
      structuredefinitions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Structuredefinition(element);
      });
      resolve(structuredefinitions);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Structuredefinition >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let abstract = args['abstract'];
    let base = args['base'];
    let base_path = args['base_path'];
    let context_type = args['context_type'];
    let date = args['date'];
    let derivation = args['derivation'];
    let description = args['description'];
    let experimental = args['experimental'];
    let ext_context = args['ext_context'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let keyword = args['keyword'];
    let kind = args['kind'];
    let name = args['name'];
    let path = args['path'];
    let publisher = args['publisher'];
    let status = args['status'];
    let title = args['title'];
    let type = args['type'];
    let url = args['url'];
    let valueset = args['valueset'];
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
    let collection = db.collection(`${COLLECTION.STRUCTUREDEFINITION}_${base_version}`);
    let Structuredefinition = getStructuredefinition(base_version);

    // Query our collection for structuredefinition history by id
    collection.find(query).toArray().then((structuredefinitions) => {
      structuredefinitions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Structuredefinition(element);
      });
      resolve(structuredefinitions);
    }).catch(_reject);
  });
