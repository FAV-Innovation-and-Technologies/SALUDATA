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

let getProcedurerequest = (base_version) => {
  return resolveSchema(base_version, 'Procedurerequest');
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

  // Procedurerequest search params
  let authored = args['authored'];
  let based_on = args['based_on'];
  let body_site = args['body_site'];
  let code = args['code'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let occurrence = args['occurrence'];
  let patient = args['patient'];
  let performer = args['performer'];
  let performer_type = args['performer_type'];
  let priority = args['priority'];
  let replaces = args['replaces'];
  let requester = args['requester'];
  let requisition = args['requisition'];
  let specimen = args['specimen'];
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

  if (body_site) {
    query.body_site = stringQueryBuilder(body_site);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
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

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (performer_type) {
    let queryBuilder = tokenQueryBuilder(performer_type, 'code', 'performer_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (replaces) {
    query.replaces = stringQueryBuilder(replaces);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
  }

  if (requisition) {
    query.requisition = stringQueryBuilder(requisition);
  }

  if (specimen) {
    query.specimen = stringQueryBuilder(specimen);
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

  // Procedurerequest search params for DSTU2
  let authored = args['authored'];
  let based_on = args['based_on'];
  let body_site = args['body_site'];
  let code = args['code'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let occurrence = args['occurrence'];
  let patient = args['patient'];
  let performer = args['performer'];
  let performer_type = args['performer_type'];
  let priority = args['priority'];
  let replaces = args['replaces'];
  let requester = args['requester'];
  let requisition = args['requisition'];
  let specimen = args['specimen'];
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

  if (body_site) {
    query.body_site = stringQueryBuilder(body_site);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
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

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (performer_type) {
    let queryBuilder = tokenQueryBuilder(performer_type, 'code', 'performer_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (replaces) {
    query.replaces = stringQueryBuilder(replaces);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
  }

  if (requisition) {
    query.requisition = stringQueryBuilder(requisition);
  }

  if (specimen) {
    query.specimen = stringQueryBuilder(specimen);
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
  logger.info('Procedurerequest >>> search');

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
  let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${base_version}`);
  let Procedurerequest = getProcedurerequest(base_version);

  try {
    // Query our collection for this procedurerequest
    const cursor = collection.find(query);
    const procedurerequests = await cursor.toArray();

    procedurerequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Procedurerequest(element);
    });

    return toSearchBundle(procedurerequests);
  } catch (err) {
    logger.error('Error with Procedurerequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Procedurerequest >>> searchById');

  let { base_version, id } = args;
  let Procedurerequest = getProcedurerequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${base_version}`);

  try {
    // Query our collection for this procedurerequest
    const procedurerequest = await collection.findOne({ id: id.toString() });

    if (procedurerequest) {
      delete procedurerequest._id;
      return new Procedurerequest(procedurerequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Procedurerequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Procedurerequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${base_version}`);

    // Get current record
    let Procedurerequest = getProcedurerequest(base_version);
    let procedurerequest = new Procedurerequest(resource);
    delete procedurerequest._id;

    // If no resource ID was provided, generate one.
    let id = procedurerequest.id || getUuid();
    if (!procedurerequest.id) {
      procedurerequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    procedurerequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(procedurerequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Procedurerequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Procedurerequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${base_version}`);

    // Get current record
    let Procedurerequest = getProcedurerequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Procedurerequest Class
    let procedurerequest = new Procedurerequest(resource);
    delete procedurerequest._id;
    procedurerequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(procedurerequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Procedurerequest updated with id: ' + id);
      resolve({
        id: procedurerequest.id,
        created: false,
        resource_version: procedurerequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Procedurerequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Procedurerequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Procedurerequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Procedurerequest = getProcedurerequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${base_version}`);

    // Query our collection for this procedurerequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((procedurerequest) => {
      if (procedurerequest) {
        delete procedurerequest._id;
        resolve(new Procedurerequest(procedurerequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Procedurerequest >>> history');

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
    let body_site = args['body_site'];
    let code = args['code'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let occurrence = args['occurrence'];
    let patient = args['patient'];
    let performer = args['performer'];
    let performer_type = args['performer_type'];
    let priority = args['priority'];
    let replaces = args['replaces'];
    let requester = args['requester'];
    let requisition = args['requisition'];
    let specimen = args['specimen'];
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
    let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${base_version}`);
    let Procedurerequest = getProcedurerequest(base_version);

    // Query our collection for procedurerequest history
    collection.find(query).toArray().then((procedurerequests) => {
      procedurerequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Procedurerequest(element);
      });
      resolve(procedurerequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Procedurerequest >>> historyById');

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
    let body_site = args['body_site'];
    let code = args['code'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let occurrence = args['occurrence'];
    let patient = args['patient'];
    let performer = args['performer'];
    let performer_type = args['performer_type'];
    let priority = args['priority'];
    let replaces = args['replaces'];
    let requester = args['requester'];
    let requisition = args['requisition'];
    let specimen = args['specimen'];
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
    let collection = db.collection(`${COLLECTION.PROCEDUREREQUEST}_${base_version}`);
    let Procedurerequest = getProcedurerequest(base_version);

    // Query our collection for procedurerequest history by id
    collection.find(query).toArray().then((procedurerequests) => {
      procedurerequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Procedurerequest(element);
      });
      resolve(procedurerequests);
    }).catch(_reject);
  });
