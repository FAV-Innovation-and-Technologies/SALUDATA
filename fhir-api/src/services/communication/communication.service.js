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

let getCommunication = (base_version) => {
  return resolveSchema(base_version, 'Communication');
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

  // Communication search params
  let based_on = args['based_on'];
  let category = args['category'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let medium = args['medium'];
  let part_of = args['part_of'];
  let patient = args['patient'];
  let received = args['received'];
  let recipient = args['recipient'];
  let sender = args['sender'];
  let sent = args['sent'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
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

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (received) {
    query.received = stringQueryBuilder(received);
  }

  if (recipient) {
    query.recipient = stringQueryBuilder(recipient);
  }

  if (sender) {
    query.sender = stringQueryBuilder(sender);
  }

  if (sent) {
    query.sent = stringQueryBuilder(sent);
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

  // Communication search params for DSTU2
  let based_on = args['based_on'];
  let category = args['category'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let medium = args['medium'];
  let part_of = args['part_of'];
  let patient = args['patient'];
  let received = args['received'];
  let recipient = args['recipient'];
  let sender = args['sender'];
  let sent = args['sent'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
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

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (received) {
    query.received = stringQueryBuilder(received);
  }

  if (recipient) {
    query.recipient = stringQueryBuilder(recipient);
  }

  if (sender) {
    query.sender = stringQueryBuilder(sender);
  }

  if (sent) {
    query.sent = stringQueryBuilder(sent);
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
  logger.info('Communication >>> search');

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
  let collection = db.collection(`${COLLECTION.COMMUNICATION}_${base_version}`);
  let Communication = getCommunication(base_version);

  try {
    // Query our collection for this communication
    const cursor = collection.find(query);
    const communications = await cursor.toArray();

    communications.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Communication(element);
    });

    return toSearchBundle(communications);
  } catch (err) {
    logger.error('Error with Communication.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Communication >>> searchById');

  let { base_version, id } = args;
  let Communication = getCommunication(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.COMMUNICATION}_${base_version}`);

  try {
    // Query our collection for this communication
    const communication = await collection.findOne({ id: id.toString() });

    if (communication) {
      delete communication._id;
      return new Communication(communication);
    }
    return null;
  } catch (err) {
    logger.error('Error with Communication.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Communication >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATION}_${base_version}`);

    // Get current record
    let Communication = getCommunication(base_version);
    let communication = new Communication(resource);
    delete communication._id;

    // If no resource ID was provided, generate one and assign it to the resource
    let id = communication.id || getUuid();
    if (!communication.id) {
      communication.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    communication.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    // Convert to plain object to prevent MongoDB from persisting internal _id Binary
    let doc = JSON.parse(JSON.stringify(communication));
    if (doc._id) {
      delete doc._id;
    }
    collection.insertOne(doc).then((_result) => {
      logger.info('Communication created with id: ' + id);
      // Return the resource with id
      resolve(Object.assign({}, doc, { id: id }));
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Communication >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATION}_${base_version}`);

    // Get current record
    let Communication = getCommunication(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Communication Class
    let communication = new Communication(resource);
    delete communication._id;
    communication.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(communication));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Communication updated with id: ' + id);
      resolve({
        id: communication.id,
        created: false,
        resource_version: communication.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communication >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Communication deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communication >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Communication = getCommunication(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMMUNICATION}_${base_version}`);

    // Query our collection for this communication with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((communication) => {
      if (communication) {
        delete communication._id;
        resolve(new Communication(communication));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communication >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let based_on = args['based_on'];
    let category = args['category'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let medium = args['medium'];
    let part_of = args['part_of'];
    let patient = args['patient'];
    let received = args['received'];
    let recipient = args['recipient'];
    let sender = args['sender'];
    let sent = args['sent'];
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
    let collection = db.collection(`${COLLECTION.COMMUNICATION}_${base_version}`);
    let Communication = getCommunication(base_version);

    // Query our collection for communication history
    collection.find(query).toArray().then((communications) => {
      communications.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Communication(element);
      });
      resolve(communications);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Communication >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let based_on = args['based_on'];
    let category = args['category'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let medium = args['medium'];
    let part_of = args['part_of'];
    let patient = args['patient'];
    let received = args['received'];
    let recipient = args['recipient'];
    let sender = args['sender'];
    let sent = args['sent'];
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
    let collection = db.collection(`${COLLECTION.COMMUNICATION}_${base_version}`);
    let Communication = getCommunication(base_version);

    // Query our collection for communication history by id
    collection.find(query).toArray().then((communications) => {
      communications.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Communication(element);
      });
      resolve(communications);
    }).catch(_reject);
  });
