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

let getDevicerequest = (base_version) => {
  return resolveSchema(base_version, 'Devicerequest');
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

  // Devicerequest search params
  let authored_on = args['authored_on'];
  let based_on = args['based_on'];
  let code = args['code'];
  let definition = args['definition'];
  let device = args['device'];
  let encounter = args['encounter'];
  let event_date = args['event_date'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let patient = args['patient'];
  let performer = args['performer'];
  let priorrequest = args['priorrequest'];
  let requester = args['requester'];
  let status = args['status'];
  let subject = args['subject'];

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

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (event_date) {
    let queryBuilder = dateQueryBuilder(event_date, 'date', 'event_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (priorrequest) {
    query.priorrequest = stringQueryBuilder(priorrequest);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
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

  // Devicerequest search params for DSTU2
  let authored_on = args['authored_on'];
  let based_on = args['based_on'];
  let code = args['code'];
  let definition = args['definition'];
  let device = args['device'];
  let encounter = args['encounter'];
  let event_date = args['event_date'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let patient = args['patient'];
  let performer = args['performer'];
  let priorrequest = args['priorrequest'];
  let requester = args['requester'];
  let status = args['status'];
  let subject = args['subject'];

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

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (event_date) {
    let queryBuilder = dateQueryBuilder(event_date, 'date', 'event_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (priorrequest) {
    query.priorrequest = stringQueryBuilder(priorrequest);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
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
  logger.info('Devicerequest >>> search');

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
  let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${base_version}`);
  let Devicerequest = getDevicerequest(base_version);

  try {
    // Query our collection for this devicerequest
    const cursor = collection.find(query);
    const devicerequests = await cursor.toArray();

    devicerequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Devicerequest(element);
    });

    return toSearchBundle(devicerequests);
  } catch (err) {
    logger.error('Error with Devicerequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Devicerequest >>> searchById');

  let { base_version, id } = args;
  let Devicerequest = getDevicerequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${base_version}`);

  try {
    // Query our collection for this devicerequest
    const devicerequest = await collection.findOne({ id: id.toString() });

    if (devicerequest) {
      delete devicerequest._id;
      return new Devicerequest(devicerequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Devicerequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicerequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${base_version}`);

    // Get current record
    let Devicerequest = getDevicerequest(base_version);
    let devicerequest = new Devicerequest(resource);
    delete devicerequest._id;

    // If no resource ID was provided, generate one.
    let id = devicerequest.id || getUuid();
    if (!devicerequest.id) {
      devicerequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    devicerequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(devicerequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Devicerequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicerequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${base_version}`);

    // Get current record
    let Devicerequest = getDevicerequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Devicerequest Class
    let devicerequest = new Devicerequest(resource);
    delete devicerequest._id;
    devicerequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(devicerequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Devicerequest updated with id: ' + id);
      resolve({
        id: devicerequest.id,
        created: false,
        resource_version: devicerequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicerequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Devicerequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicerequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Devicerequest = getDevicerequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${base_version}`);

    // Query our collection for this devicerequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((devicerequest) => {
      if (devicerequest) {
        delete devicerequest._id;
        resolve(new Devicerequest(devicerequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicerequest >>> history');

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
    let code = args['code'];
    let definition = args['definition'];
    let device = args['device'];
    let encounter = args['encounter'];
    let event_date = args['event_date'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let patient = args['patient'];
    let performer = args['performer'];
    let priorrequest = args['priorrequest'];
    let requester = args['requester'];
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
    let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${base_version}`);
    let Devicerequest = getDevicerequest(base_version);

    // Query our collection for devicerequest history
    collection.find(query).toArray().then((devicerequests) => {
      devicerequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Devicerequest(element);
      });
      resolve(devicerequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Devicerequest >>> historyById');

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
    let code = args['code'];
    let definition = args['definition'];
    let device = args['device'];
    let encounter = args['encounter'];
    let event_date = args['event_date'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let patient = args['patient'];
    let performer = args['performer'];
    let priorrequest = args['priorrequest'];
    let requester = args['requester'];
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
    let collection = db.collection(`${COLLECTION.DEVICEREQUEST}_${base_version}`);
    let Devicerequest = getDevicerequest(base_version);

    // Query our collection for devicerequest history by id
    collection.find(query).toArray().then((devicerequests) => {
      devicerequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Devicerequest(element);
      });
      resolve(devicerequests);
    }).catch(_reject);
  });
