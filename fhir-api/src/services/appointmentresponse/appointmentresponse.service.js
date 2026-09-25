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

let getAppointmentresponse = (base_version) => {
  return resolveSchema(base_version, 'Appointmentresponse');
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

  // Appointmentresponse search params
  let actor = args['actor'];
  let appointment = args['appointment'];
  let identifier = args['identifier'];
  let location = args['location'];
  let part_status = args['part_status'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (actor) {
    query.actor = stringQueryBuilder(actor);
  }

  if (appointment) {
    query.appointment = stringQueryBuilder(appointment);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (part_status) {
    let queryBuilder = tokenQueryBuilder(part_status, 'code', 'part_status.coding');
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

  if (practitioner) {
    let queryBuilder = referenceQueryBuilder(practitioner, 'practitioner');
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

  // Appointmentresponse search params for DSTU2
  let actor = args['actor'];
  let appointment = args['appointment'];
  let identifier = args['identifier'];
  let location = args['location'];
  let part_status = args['part_status'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (actor) {
    query.actor = stringQueryBuilder(actor);
  }

  if (appointment) {
    query.appointment = stringQueryBuilder(appointment);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (part_status) {
    let queryBuilder = tokenQueryBuilder(part_status, 'code', 'part_status.coding');
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

  if (practitioner) {
    let queryBuilder = referenceQueryBuilder(practitioner, 'practitioner');
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
  logger.info('Appointmentresponse >>> search');

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
  let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${base_version}`);
  let Appointmentresponse = getAppointmentresponse(base_version);

  try {
    // Query our collection for this appointmentresponse
    const cursor = collection.find(query);
    const appointmentresponses = await cursor.toArray();

    appointmentresponses.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Appointmentresponse(element);
    });

    return toSearchBundle(appointmentresponses);
  } catch (err) {
    logger.error('Error with Appointmentresponse.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Appointmentresponse >>> searchById');

  let { base_version, id } = args;
  let Appointmentresponse = getAppointmentresponse(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${base_version}`);

  try {
    // Query our collection for this appointmentresponse
    const appointmentresponse = await collection.findOne({ id: id.toString() });

    if (appointmentresponse) {
      delete appointmentresponse._id;
      return new Appointmentresponse(appointmentresponse);
    }
    return null;
  } catch (err) {
    logger.error('Error with Appointmentresponse.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointmentresponse >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${base_version}`);

    // Get current record
    let Appointmentresponse = getAppointmentresponse(base_version);
    let appointmentresponse = new Appointmentresponse(resource);
    delete appointmentresponse._id;

    // If no resource ID was provided, generate one.
    let id = appointmentresponse.id || getUuid();
    if (!appointmentresponse.id) {
      appointmentresponse.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    appointmentresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(appointmentresponse));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Appointmentresponse created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointmentresponse >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${base_version}`);

    // Get current record
    let Appointmentresponse = getAppointmentresponse(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Appointmentresponse Class
    let appointmentresponse = new Appointmentresponse(resource);
    delete appointmentresponse._id;
    appointmentresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(appointmentresponse));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Appointmentresponse updated with id: ' + id);
      resolve({
        id: appointmentresponse.id,
        created: false,
        resource_version: appointmentresponse.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointmentresponse >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Appointmentresponse deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointmentresponse >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Appointmentresponse = getAppointmentresponse(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${base_version}`);

    // Query our collection for this appointmentresponse with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((appointmentresponse) => {
      if (appointmentresponse) {
        delete appointmentresponse._id;
        resolve(new Appointmentresponse(appointmentresponse));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointmentresponse >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let actor = args['actor'];
    let appointment = args['appointment'];
    let identifier = args['identifier'];
    let location = args['location'];
    let part_status = args['part_status'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];

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
    let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${base_version}`);
    let Appointmentresponse = getAppointmentresponse(base_version);

    // Query our collection for appointmentresponse history
    collection.find(query).toArray().then((appointmentresponses) => {
      appointmentresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Appointmentresponse(element);
      });
      resolve(appointmentresponses);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointmentresponse >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let actor = args['actor'];
    let appointment = args['appointment'];
    let identifier = args['identifier'];
    let location = args['location'];
    let part_status = args['part_status'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];

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
    let collection = db.collection(`${COLLECTION.APPOINTMENTRESPONSE}_${base_version}`);
    let Appointmentresponse = getAppointmentresponse(base_version);

    // Query our collection for appointmentresponse history by id
    collection.find(query).toArray().then((appointmentresponses) => {
      appointmentresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Appointmentresponse(element);
      });
      resolve(appointmentresponses);
    }).catch(_reject);
  });
