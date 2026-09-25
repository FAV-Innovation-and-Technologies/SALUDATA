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

let getDocumentreference = (base_version) => {
  return resolveSchema(base_version, 'Documentreference');
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

  // Documentreference search params
  let authenticator = args['authenticator'];
  let author = args['author'];
  let created = args['created'];
  let custodian = args['custodian'];
  let description = args['description'];
  let encounter = args['encounter'];
  let event = args['event'];
  let facility = args['facility'];
  let format = args['format'];
  let identifier = args['identifier'];
  let indexed = args['indexed'];
  let language = args['language'];
  let location = args['location'];
  let patient = args['patient'];
  let period = args['period'];
  let related_id = args['related_id'];
  let related_ref = args['related_ref'];
  let relatesto = args['relatesto'];
  let relation = args['relation'];
  let relationship = args['relationship'];
  let securitylabel = args['securitylabel'];
  let setting = args['setting'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authenticator) {
    query.authenticator = stringQueryBuilder(authenticator);
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (custodian) {
    query.custodian = stringQueryBuilder(custodian);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (event) {
    query.event = stringQueryBuilder(event);
  }

  if (facility) {
    query.facility = stringQueryBuilder(facility);
  }

  if (format) {
    query.format = stringQueryBuilder(format);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (indexed) {
    query.indexed = stringQueryBuilder(indexed);
  }

  if (language) {
    query.language = stringQueryBuilder(language);
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (related_id) {
    query.related_id = stringQueryBuilder(related_id);
  }

  if (related_ref) {
    query.related_ref = stringQueryBuilder(related_ref);
  }

  if (relatesto) {
    query.relatesto = stringQueryBuilder(relatesto);
  }

  if (relation) {
    query.relation = stringQueryBuilder(relation);
  }

  if (relationship) {
    query.relationship = stringQueryBuilder(relationship);
  }

  if (securitylabel) {
    query.securitylabel = stringQueryBuilder(securitylabel);
  }

  if (setting) {
    query.setting = stringQueryBuilder(setting);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
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

  // Documentreference search params for DSTU2
  let authenticator = args['authenticator'];
  let author = args['author'];
  let created = args['created'];
  let custodian = args['custodian'];
  let description = args['description'];
  let encounter = args['encounter'];
  let event = args['event'];
  let facility = args['facility'];
  let format = args['format'];
  let identifier = args['identifier'];
  let indexed = args['indexed'];
  let language = args['language'];
  let location = args['location'];
  let patient = args['patient'];
  let period = args['period'];
  let related_id = args['related_id'];
  let related_ref = args['related_ref'];
  let relatesto = args['relatesto'];
  let relation = args['relation'];
  let relationship = args['relationship'];
  let securitylabel = args['securitylabel'];
  let setting = args['setting'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authenticator) {
    query.authenticator = stringQueryBuilder(authenticator);
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (custodian) {
    query.custodian = stringQueryBuilder(custodian);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (event) {
    query.event = stringQueryBuilder(event);
  }

  if (facility) {
    query.facility = stringQueryBuilder(facility);
  }

  if (format) {
    query.format = stringQueryBuilder(format);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (indexed) {
    query.indexed = stringQueryBuilder(indexed);
  }

  if (language) {
    query.language = stringQueryBuilder(language);
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (related_id) {
    query.related_id = stringQueryBuilder(related_id);
  }

  if (related_ref) {
    query.related_ref = stringQueryBuilder(related_ref);
  }

  if (relatesto) {
    query.relatesto = stringQueryBuilder(relatesto);
  }

  if (relation) {
    query.relation = stringQueryBuilder(relation);
  }

  if (relationship) {
    query.relationship = stringQueryBuilder(relationship);
  }

  if (securitylabel) {
    query.securitylabel = stringQueryBuilder(securitylabel);
  }

  if (setting) {
    query.setting = stringQueryBuilder(setting);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
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
  logger.info('Documentreference >>> search');

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
  let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${base_version}`);
  let Documentreference = getDocumentreference(base_version);

  try {
    // Query our collection for this documentreference
    const cursor = collection.find(query);
    const documentreferences = await cursor.toArray();

    documentreferences.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Documentreference(element);
    });

    return toSearchBundle(documentreferences);
  } catch (err) {
    logger.error('Error with Documentreference.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Documentreference >>> searchById');

  let { base_version, id } = args;
  let Documentreference = getDocumentreference(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${base_version}`);

  try {
    // Query our collection for this documentreference
    const documentreference = await collection.findOne({ id: id.toString() });

    if (documentreference) {
      delete documentreference._id;
      return new Documentreference(documentreference);
    }
    return null;
  } catch (err) {
    logger.error('Error with Documentreference.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentreference >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${base_version}`);

    // Get current record
    let Documentreference = getDocumentreference(base_version);
    let documentreference = new Documentreference(resource);
    delete documentreference._id;

    // If no resource ID was provided, generate one.
    let id = documentreference.id || getUuid();
    if (!documentreference.id) {
      documentreference.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    documentreference.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(documentreference));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Documentreference created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentreference >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${base_version}`);

    // Get current record
    let Documentreference = getDocumentreference(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Documentreference Class
    let documentreference = new Documentreference(resource);
    delete documentreference._id;
    documentreference.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(documentreference));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Documentreference updated with id: ' + id);
      resolve({
        id: documentreference.id,
        created: false,
        resource_version: documentreference.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentreference >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Documentreference deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentreference >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Documentreference = getDocumentreference(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${base_version}`);

    // Query our collection for this documentreference with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((documentreference) => {
      if (documentreference) {
        delete documentreference._id;
        resolve(new Documentreference(documentreference));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentreference >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authenticator = args['authenticator'];
    let author = args['author'];
    let created = args['created'];
    let custodian = args['custodian'];
    let description = args['description'];
    let encounter = args['encounter'];
    let event = args['event'];
    let facility = args['facility'];
    let format = args['format'];
    let identifier = args['identifier'];
    let indexed = args['indexed'];
    let language = args['language'];
    let location = args['location'];
    let patient = args['patient'];
    let period = args['period'];
    let related_id = args['related_id'];
    let related_ref = args['related_ref'];
    let relatesto = args['relatesto'];
    let relation = args['relation'];
    let relationship = args['relationship'];
    let securitylabel = args['securitylabel'];
    let setting = args['setting'];
    let status = args['status'];
    let subject = args['subject'];
    let type = args['type'];

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
    let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${base_version}`);
    let Documentreference = getDocumentreference(base_version);

    // Query our collection for documentreference history
    collection.find(query).toArray().then((documentreferences) => {
      documentreferences.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Documentreference(element);
      });
      resolve(documentreferences);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentreference >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authenticator = args['authenticator'];
    let author = args['author'];
    let created = args['created'];
    let custodian = args['custodian'];
    let description = args['description'];
    let encounter = args['encounter'];
    let event = args['event'];
    let facility = args['facility'];
    let format = args['format'];
    let identifier = args['identifier'];
    let indexed = args['indexed'];
    let language = args['language'];
    let location = args['location'];
    let patient = args['patient'];
    let period = args['period'];
    let related_id = args['related_id'];
    let related_ref = args['related_ref'];
    let relatesto = args['relatesto'];
    let relation = args['relation'];
    let relationship = args['relationship'];
    let securitylabel = args['securitylabel'];
    let setting = args['setting'];
    let status = args['status'];
    let subject = args['subject'];
    let type = args['type'];

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
    let collection = db.collection(`${COLLECTION.DOCUMENTREFERENCE}_${base_version}`);
    let Documentreference = getDocumentreference(base_version);

    // Query our collection for documentreference history by id
    collection.find(query).toArray().then((documentreferences) => {
      documentreferences.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Documentreference(element);
      });
      resolve(documentreferences);
    }).catch(_reject);
  });
