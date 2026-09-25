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

let getReferralrequest = (base_version) => {
  return resolveSchema(base_version, 'Referralrequest');
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

  // Referralrequest search params
  let authored_on = args['authored_on'];
  let based_on = args['based_on'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let occurrence_date = args['occurrence_date'];
  let patient = args['patient'];
  let priority = args['priority'];
  let recipient = args['recipient'];
  let replaces = args['replaces'];
  let requester = args['requester'];
  let service = args['service'];
  let specialty = args['specialty'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authored_on) {
    query.authored_on = stringQueryBuilder(authored_on);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (occurrence_date) {
    let queryBuilder = dateQueryBuilder(occurrence_date, 'date', 'occurrence_date');
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

  if (service) {
    query.service = stringQueryBuilder(service);
  }

  if (specialty) {
    query.specialty = stringQueryBuilder(specialty);
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

  // Referralrequest search params for DSTU2
  let authored_on = args['authored_on'];
  let based_on = args['based_on'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let occurrence_date = args['occurrence_date'];
  let patient = args['patient'];
  let priority = args['priority'];
  let recipient = args['recipient'];
  let replaces = args['replaces'];
  let requester = args['requester'];
  let service = args['service'];
  let specialty = args['specialty'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authored_on) {
    query.authored_on = stringQueryBuilder(authored_on);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (occurrence_date) {
    let queryBuilder = dateQueryBuilder(occurrence_date, 'date', 'occurrence_date');
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

  if (service) {
    query.service = stringQueryBuilder(service);
  }

  if (specialty) {
    query.specialty = stringQueryBuilder(specialty);
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
  logger.info('Referralrequest >>> search');

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
  let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${base_version}`);
  let Referralrequest = getReferralrequest(base_version);

  try {
    // Query our collection for this referralrequest
    const cursor = collection.find(query);
    const referralrequests = await cursor.toArray();

    referralrequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Referralrequest(element);
    });

    return toSearchBundle(referralrequests);
  } catch (err) {
    logger.error('Error with Referralrequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Referralrequest >>> searchById');

  let { base_version, id } = args;
  let Referralrequest = getReferralrequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${base_version}`);

  try {
    // Query our collection for this referralrequest
    const referralrequest = await collection.findOne({ id: id.toString() });

    if (referralrequest) {
      delete referralrequest._id;
      return new Referralrequest(referralrequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Referralrequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Referralrequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${base_version}`);

    // Get current record
    let Referralrequest = getReferralrequest(base_version);
    let referralrequest = new Referralrequest(resource);
    delete referralrequest._id;

    // If no resource ID was provided, generate one.
    let id = referralrequest.id || getUuid();
    if (!referralrequest.id) {
      referralrequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    referralrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(referralrequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Referralrequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Referralrequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${base_version}`);

    // Get current record
    let Referralrequest = getReferralrequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Referralrequest Class
    let referralrequest = new Referralrequest(resource);
    delete referralrequest._id;
    referralrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(referralrequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Referralrequest updated with id: ' + id);
      resolve({
        id: referralrequest.id,
        created: false,
        resource_version: referralrequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Referralrequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Referralrequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Referralrequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Referralrequest = getReferralrequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${base_version}`);

    // Query our collection for this referralrequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((referralrequest) => {
      if (referralrequest) {
        delete referralrequest._id;
        resolve(new Referralrequest(referralrequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Referralrequest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authored_on = args['authored_on'];
    let based_on = args['based_on'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let occurrence_date = args['occurrence_date'];
    let patient = args['patient'];
    let priority = args['priority'];
    let recipient = args['recipient'];
    let replaces = args['replaces'];
    let requester = args['requester'];
    let service = args['service'];
    let specialty = args['specialty'];
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
    let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${base_version}`);
    let Referralrequest = getReferralrequest(base_version);

    // Query our collection for referralrequest history
    collection.find(query).toArray().then((referralrequests) => {
      referralrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Referralrequest(element);
      });
      resolve(referralrequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Referralrequest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authored_on = args['authored_on'];
    let based_on = args['based_on'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let occurrence_date = args['occurrence_date'];
    let patient = args['patient'];
    let priority = args['priority'];
    let recipient = args['recipient'];
    let replaces = args['replaces'];
    let requester = args['requester'];
    let service = args['service'];
    let specialty = args['specialty'];
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
    let collection = db.collection(`${COLLECTION.REFERRALREQUEST}_${base_version}`);
    let Referralrequest = getReferralrequest(base_version);

    // Query our collection for referralrequest history by id
    collection.find(query).toArray().then((referralrequests) => {
      referralrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Referralrequest(element);
      });
      resolve(referralrequests);
    }).catch(_reject);
  });
