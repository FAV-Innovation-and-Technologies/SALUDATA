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

let getCapabilitystatement = (base_version) => {
  return resolveSchema(base_version, 'Capabilitystatement');
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

  // Capabilitystatement search params
  let date = args['date'];
  let description = args['description'];
  let event = args['event'];
  let fhirversion = args['fhirversion'];
  let format = args['format'];
  let guide = args['guide'];
  let jurisdiction = args['jurisdiction'];
  let mode = args['mode'];
  let name = args['name'];
  let publisher = args['publisher'];
  let resource = args['resource'];
  let resource_profile = args['resource_profile'];
  let security_service = args['security_service'];
  let software = args['software'];
  let status = args['status'];
  let supported_profile = args['supported_profile'];
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

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (event) {
    query.event = stringQueryBuilder(event);
  }

  if (fhirversion) {
    query.fhirversion = stringQueryBuilder(fhirversion);
  }

  if (format) {
    query.format = stringQueryBuilder(format);
  }

  if (guide) {
    query.guide = stringQueryBuilder(guide);
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (mode) {
    query.mode = stringQueryBuilder(mode);
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

  if (resource_profile) {
    query.resource_profile = stringQueryBuilder(resource_profile);
  }

  if (security_service) {
    query.security_service = stringQueryBuilder(security_service);
  }

  if (software) {
    query.software = stringQueryBuilder(software);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (supported_profile) {
    query.supported_profile = stringQueryBuilder(supported_profile);
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

  // Capabilitystatement search params for DSTU2
  let date = args['date'];
  let description = args['description'];
  let event = args['event'];
  let fhirversion = args['fhirversion'];
  let format = args['format'];
  let guide = args['guide'];
  let jurisdiction = args['jurisdiction'];
  let mode = args['mode'];
  let name = args['name'];
  let publisher = args['publisher'];
  let resource = args['resource'];
  let resource_profile = args['resource_profile'];
  let security_service = args['security_service'];
  let software = args['software'];
  let status = args['status'];
  let supported_profile = args['supported_profile'];
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

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (event) {
    query.event = stringQueryBuilder(event);
  }

  if (fhirversion) {
    query.fhirversion = stringQueryBuilder(fhirversion);
  }

  if (format) {
    query.format = stringQueryBuilder(format);
  }

  if (guide) {
    query.guide = stringQueryBuilder(guide);
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (mode) {
    query.mode = stringQueryBuilder(mode);
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

  if (resource_profile) {
    query.resource_profile = stringQueryBuilder(resource_profile);
  }

  if (security_service) {
    query.security_service = stringQueryBuilder(security_service);
  }

  if (software) {
    query.software = stringQueryBuilder(software);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (supported_profile) {
    query.supported_profile = stringQueryBuilder(supported_profile);
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
  logger.info('Capabilitystatement >>> search');

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
  let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${base_version}`);
  let Capabilitystatement = getCapabilitystatement(base_version);

  try {
    // Query our collection for this capabilitystatement
    const cursor = collection.find(query);
    const capabilitystatements = await cursor.toArray();

    capabilitystatements.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Capabilitystatement(element);
    });

    return toSearchBundle(capabilitystatements);
  } catch (err) {
    logger.error('Error with Capabilitystatement.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Capabilitystatement >>> searchById');

  let { base_version, id } = args;
  let Capabilitystatement = getCapabilitystatement(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${base_version}`);

  try {
    // Query our collection for this capabilitystatement
    const capabilitystatement = await collection.findOne({ id: id.toString() });

    if (capabilitystatement) {
      delete capabilitystatement._id;
      return new Capabilitystatement(capabilitystatement);
    }
    return null;
  } catch (err) {
    logger.error('Error with Capabilitystatement.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Capabilitystatement >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${base_version}`);

    // Get current record
    let Capabilitystatement = getCapabilitystatement(base_version);
    let capabilitystatement = new Capabilitystatement(resource);
    delete capabilitystatement._id;

    // If no resource ID was provided, generate one.
    let id = capabilitystatement.id || getUuid();
    if (!capabilitystatement.id) {
      capabilitystatement.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    capabilitystatement.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(capabilitystatement));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Capabilitystatement created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Capabilitystatement >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${base_version}`);

    // Get current record
    let Capabilitystatement = getCapabilitystatement(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Capabilitystatement Class
    let capabilitystatement = new Capabilitystatement(resource);
    delete capabilitystatement._id;
    capabilitystatement.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(capabilitystatement));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Capabilitystatement updated with id: ' + id);
      resolve({
        id: capabilitystatement.id,
        created: false,
        resource_version: capabilitystatement.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Capabilitystatement >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Capabilitystatement deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Capabilitystatement >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Capabilitystatement = getCapabilitystatement(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${base_version}`);

    // Query our collection for this capabilitystatement with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((capabilitystatement) => {
      if (capabilitystatement) {
        delete capabilitystatement._id;
        resolve(new Capabilitystatement(capabilitystatement));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Capabilitystatement >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let description = args['description'];
    let event = args['event'];
    let fhirversion = args['fhirversion'];
    let format = args['format'];
    let guide = args['guide'];
    let jurisdiction = args['jurisdiction'];
    let mode = args['mode'];
    let name = args['name'];
    let publisher = args['publisher'];
    let resource = args['resource'];
    let resource_profile = args['resource_profile'];
    let security_service = args['security_service'];
    let software = args['software'];
    let status = args['status'];
    let supported_profile = args['supported_profile'];
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
    let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${base_version}`);
    let Capabilitystatement = getCapabilitystatement(base_version);

    // Query our collection for capabilitystatement history
    collection.find(query).toArray().then((capabilitystatements) => {
      capabilitystatements.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Capabilitystatement(element);
      });
      resolve(capabilitystatements);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Capabilitystatement >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let description = args['description'];
    let event = args['event'];
    let fhirversion = args['fhirversion'];
    let format = args['format'];
    let guide = args['guide'];
    let jurisdiction = args['jurisdiction'];
    let mode = args['mode'];
    let name = args['name'];
    let publisher = args['publisher'];
    let resource = args['resource'];
    let resource_profile = args['resource_profile'];
    let security_service = args['security_service'];
    let software = args['software'];
    let status = args['status'];
    let supported_profile = args['supported_profile'];
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
    let collection = db.collection(`${COLLECTION.CAPABILITYSTATEMENT}_${base_version}`);
    let Capabilitystatement = getCapabilitystatement(base_version);

    // Query our collection for capabilitystatement history by id
    collection.find(query).toArray().then((capabilitystatements) => {
      capabilitystatements.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Capabilitystatement(element);
      });
      resolve(capabilitystatements);
    }).catch(_reject);
  });
