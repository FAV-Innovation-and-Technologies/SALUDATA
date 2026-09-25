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

let getCommunicationrequest = (base_version) => {
  return resolveSchema(base_version, 'CommunicationRequest');
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

  // Communicationrequest search params
  let authored = args['authored'];
  let based_on = args['based_on'];
  let category = args['category'];
  let encounter = args['encounter'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let medium = args['medium'];
  let occurrence = args['occurrence'];
  let patient = args['patient'];
  let priority = args['priority'];
  let recipient = args['recipient'];
  let replaces = args['replaces'];
  let requester = args['requester'];
  let sender = args['sender'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authored) {
    query.authored = stringQueryBuilder(authored);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (group_identifier) {
    let queryBuilder = tokenQueryBuilder(group_identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (medium) {
    query.medium = stringQueryBuilder(medium);
  }

  if (occurrence) {
    query.occurrence = stringQueryBuilder(occurrence);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (recipient) {
    query.recipient = stringQueryBuilder(recipient);
  }

  if (replaces) {
    query.replaces = stringQueryBuilder(replaces);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
  }

  if (sender) {
    query.sender = stringQueryBuilder(sender);
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

  // Communicationrequest search params for DSTU2
  let authored = args['authored'];
  let based_on = args['based_on'];
  let category = args['category'];
  let encounter = args['encounter'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let medium = args['medium'];
  let occurrence = args['occurrence'];
  let patient = args['patient'];
  let priority = args['priority'];
  let recipient = args['recipient'];
  let replaces = args['replaces'];
  let requester = args['requester'];
  let sender = args['sender'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authored) {
    query.authored = stringQueryBuilder(authored);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (group_identifier) {
    let queryBuilder = tokenQueryBuilder(group_identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (medium) {
    query.medium = stringQueryBuilder(medium);
  }

  if (occurrence) {
    query.occurrence = stringQueryBuilder(occurrence);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (recipient) {
    query.recipient = stringQueryBuilder(recipient);
  }

  if (replaces) {
    query.replaces = stringQueryBuilder(replaces);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
  }

  if (sender) {
    query.sender = stringQueryBuilder(sender);
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

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Communicationrequest >>> search');

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
  let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${base_version}`);
  let Communicationrequest = getCommunicationrequest(base_version);

  try {
    // Query our collection for this communicationrequest
    const cursor = collection.find(query);
    const communicationrequests = await cursor.toArray();

    communicationrequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Communicationrequest(element);
    });

    return toSearchBundle(communicationrequests);
  } catch (err) {
    logger.error('Error with Communicationrequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Communicationrequest >>> searchById');

  let { base_version, id } = args;
  let Communicationrequest = getCommunicationrequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${base_version}`);

  try {
    // Query our collection for this communicationrequest
    const communicationrequest = await collection.findOne({ id: id.toString() });

    if (communicationrequest) {
      delete communicationrequest._id;
      return new Communicationrequest(communicationrequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Communicationrequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Communicationrequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${base_version}`);

    // Get current record
    let Communicationrequest = getCommunicationrequest(base_version);
    let communicationrequest = new Communicationrequest(resource);
    delete communicationrequest._id;

    // If no resource ID was provided, generate one and assign it to the resource
    let id = communicationrequest.id || getUuid();
    if (!communicationrequest.id) {
      communicationrequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    communicationrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    // Convert to plain object to prevent MongoDB from persisting internal _id Binary
    let doc = JSON.parse(JSON.stringify(communicationrequest));
    if (doc._id) {
      delete doc._id;
    }
    collection.insertOne(doc).then((_result) => {
      logger.info('Communicationrequest created with id: ' + id);
      // Return the resource with id
      resolve(Object.assign({}, doc, { id: id }));
    }).catch((err) => {
      logger.error('Error with Communicationrequest.create: ', err);
      reject(handleError({ error: err }));
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('Communicationrequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${base_version}`);

    // Get current record
    let Communicationrequest = getCommunicationrequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Communicationrequest Class
    let communicationrequest = new Communicationrequest(resource);
    delete communicationrequest._id;
    communicationrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(communicationrequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Communicationrequest updated with id: ' + id);
      resolve({
        id: communicationrequest.id,
        created: false,
        resource_version: communicationrequest.meta.versionId,
      });
    }).catch((err) => {
      logger.error('Error with Communicationrequest.update: ', err);
      reject(handleError({ error: err }));
    });
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communicationrequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Communicationrequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communicationrequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Communicationrequest = getCommunicationrequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${base_version}`);

    // Query our collection for this communicationrequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((communicationrequest) => {
      if (communicationrequest) {
        delete communicationrequest._id;
        resolve(new Communicationrequest(communicationrequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communicationrequest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authored = args['authored'];
    let based_on = args['based_on'];
    let category = args['category'];
    let encounter = args['encounter'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let medium = args['medium'];
    let occurrence = args['occurrence'];
    let patient = args['patient'];
    let priority = args['priority'];
    let recipient = args['recipient'];
    let replaces = args['replaces'];
    let requester = args['requester'];
    let sender = args['sender'];
    let status = args['status'];
    let subject = args['subject'];

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
    let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${base_version}`);
    let Communicationrequest = getCommunicationrequest(base_version);

    // Query our collection for communicationrequest history
    collection.find(query).toArray().then((communicationrequests) => {
      communicationrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Communicationrequest(element);
      });
      resolve(communicationrequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communicationrequest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authored = args['authored'];
    let based_on = args['based_on'];
    let category = args['category'];
    let encounter = args['encounter'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let medium = args['medium'];
    let occurrence = args['occurrence'];
    let patient = args['patient'];
    let priority = args['priority'];
    let recipient = args['recipient'];
    let replaces = args['replaces'];
    let requester = args['requester'];
    let sender = args['sender'];
    let status = args['status'];
    let subject = args['subject'];

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
    let collection = db.collection(`${COLLECTION.COMMUNICATIONREQUEST}_${base_version}`);
    let Communicationrequest = getCommunicationrequest(base_version);

    // Query our collection for communicationrequest history by id
    collection.find(query).toArray().then((communicationrequests) => {
      communicationrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Communicationrequest(element);
      });
      resolve(communicationrequests);
    }).catch(_reject);
  });
