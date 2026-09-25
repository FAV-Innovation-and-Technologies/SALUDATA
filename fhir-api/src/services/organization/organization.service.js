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

let getOrganization = (base_version) => {
  return resolveSchema(base_version, 'Organization');
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

  // Organization search params
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

  // Organization search params for DSTU2
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
  logger.info('Organization >>> search');

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
  let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);
  let Organization = getOrganization(base_version);

  try {
    // Query our collection for this organization
    const cursor = collection.find(query);
    const organizations = await cursor.toArray();

    organizations.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Organization(element);
    });

    return toSearchBundle(organizations);
  } catch (err) {
    logger.error('Error with Organization.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Organization >>> searchById');

  let { base_version, id } = args;
  let Organization = getOrganization(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);

  try {
    // Query our collection for this organization
    const organization = await collection.findOne({ id: id.toString() });

    if (organization) {
      delete organization._id;
      return new Organization(organization);
    }
    return null;
  } catch (err) {
    logger.error('Error with Organization.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Organization >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);

    // Get current record
    let Organization = getOrganization(base_version);
    let organization = new Organization(resource);
    delete organization._id;

    // If no resource ID was provided, generate one.
    let id = organization.id || getUuid();
    if (!organization.id) {
      organization.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    organization.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(organization));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Organization created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Organization >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);

    // Get current record
    let Organization = getOrganization(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Organization Class
    let organization = new Organization(resource);
    delete organization._id;
    organization.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(organization));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Organization updated with id: ' + id);
      resolve({
        id: organization.id,
        created: false,
        resource_version: organization.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Organization >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ORGANIZATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Organization deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Organization >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Organization = getOrganization(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);

    // Query our collection for this organization with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((organization) => {
      if (organization) {
        delete organization._id;
        resolve(new Organization(organization));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Organization >>> history');

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
    let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);
    let Organization = getOrganization(base_version);

    // Query our collection for organization history
    collection.find(query).toArray().then((organizations) => {
      organizations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Organization(element);
      });
      resolve(organizations);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Organization >>> historyById');

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
    let collection = db.collection(`${COLLECTION.ORGANIZATION}_${base_version}`);
    let Organization = getOrganization(base_version);

    // Query our collection for organization history by id
    collection.find(query).toArray().then((organizations) => {
      organizations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Organization(element);
      });
      resolve(organizations);
    }).catch(_reject);
  });
