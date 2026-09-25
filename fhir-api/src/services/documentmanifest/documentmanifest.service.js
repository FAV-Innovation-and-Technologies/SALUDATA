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

let getDocumentmanifest = (base_version) => {
  return resolveSchema(base_version, 'Documentmanifest');
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

  // Documentmanifest search params
  let author = args['author'];
  let content_ref = args['content_ref'];
  let created = args['created'];
  let description = args['description'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let recipient = args['recipient'];
  let related_id = args['related_id'];
  let related_ref = args['related_ref'];
  let source = args['source'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (content_ref) {
    query.content_ref = stringQueryBuilder(content_ref);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (recipient) {
    query.recipient = stringQueryBuilder(recipient);
  }

  if (related_id) {
    query.related_id = stringQueryBuilder(related_id);
  }

  if (related_ref) {
    query.related_ref = stringQueryBuilder(related_ref);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
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

  // Documentmanifest search params for DSTU2
  let author = args['author'];
  let content_ref = args['content_ref'];
  let created = args['created'];
  let description = args['description'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let recipient = args['recipient'];
  let related_id = args['related_id'];
  let related_ref = args['related_ref'];
  let source = args['source'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (content_ref) {
    query.content_ref = stringQueryBuilder(content_ref);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (recipient) {
    query.recipient = stringQueryBuilder(recipient);
  }

  if (related_id) {
    query.related_id = stringQueryBuilder(related_id);
  }

  if (related_ref) {
    query.related_ref = stringQueryBuilder(related_ref);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
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
  logger.info('Documentmanifest >>> search');

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
  let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${base_version}`);
  let Documentmanifest = getDocumentmanifest(base_version);

  try {
    // Query our collection for this documentmanifest
    const cursor = collection.find(query);
    const documentmanifests = await cursor.toArray();

    documentmanifests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Documentmanifest(element);
    });

    return toSearchBundle(documentmanifests);
  } catch (err) {
    logger.error('Error with Documentmanifest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Documentmanifest >>> searchById');

  let { base_version, id } = args;
  let Documentmanifest = getDocumentmanifest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${base_version}`);

  try {
    // Query our collection for this documentmanifest
    const documentmanifest = await collection.findOne({ id: id.toString() });

    if (documentmanifest) {
      delete documentmanifest._id;
      return new Documentmanifest(documentmanifest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Documentmanifest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentmanifest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${base_version}`);

    // Get current record
    let Documentmanifest = getDocumentmanifest(base_version);
    let documentmanifest = new Documentmanifest(resource);
    delete documentmanifest._id;

    // If no resource ID was provided, generate one.
    let id = documentmanifest.id || getUuid();
    if (!documentmanifest.id) {
      documentmanifest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    documentmanifest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(documentmanifest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Documentmanifest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentmanifest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${base_version}`);

    // Get current record
    let Documentmanifest = getDocumentmanifest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Documentmanifest Class
    let documentmanifest = new Documentmanifest(resource);
    delete documentmanifest._id;
    documentmanifest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(documentmanifest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Documentmanifest updated with id: ' + id);
      resolve({
        id: documentmanifest.id,
        created: false,
        resource_version: documentmanifest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentmanifest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Documentmanifest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentmanifest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Documentmanifest = getDocumentmanifest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${base_version}`);

    // Query our collection for this documentmanifest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((documentmanifest) => {
      if (documentmanifest) {
        delete documentmanifest._id;
        resolve(new Documentmanifest(documentmanifest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentmanifest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let content_ref = args['content_ref'];
    let created = args['created'];
    let description = args['description'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let recipient = args['recipient'];
    let related_id = args['related_id'];
    let related_ref = args['related_ref'];
    let source = args['source'];
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
    let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${base_version}`);
    let Documentmanifest = getDocumentmanifest(base_version);

    // Query our collection for documentmanifest history
    collection.find(query).toArray().then((documentmanifests) => {
      documentmanifests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Documentmanifest(element);
      });
      resolve(documentmanifests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Documentmanifest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let content_ref = args['content_ref'];
    let created = args['created'];
    let description = args['description'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let recipient = args['recipient'];
    let related_id = args['related_id'];
    let related_ref = args['related_ref'];
    let source = args['source'];
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
    let collection = db.collection(`${COLLECTION.DOCUMENTMANIFEST}_${base_version}`);
    let Documentmanifest = getDocumentmanifest(base_version);

    // Query our collection for documentmanifest history by id
    collection.find(query).toArray().then((documentmanifests) => {
      documentmanifests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Documentmanifest(element);
      });
      resolve(documentmanifests);
    }).catch(_reject);
  });
