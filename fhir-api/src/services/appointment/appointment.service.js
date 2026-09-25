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

let getAppointment = (base_version) => {
  return resolveSchema(base_version, 'Appointment');
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

  // Appointment search params
  let actor = args['actor'];
  let appointment_type = args['appointment_type'];
  let date = args['date'];
  let identifier = args['identifier'];
  let incomingreferral = args['incomingreferral'];
  let location = args['location'];
  let part_status = args['part_status'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];
  let service_type = args['service_type'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (actor) {
    query.actor = stringQueryBuilder(actor);
  }

  if (appointment_type) {
    let queryBuilder = tokenQueryBuilder(appointment_type, 'code', 'appointment_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
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

  if (incomingreferral) {
    query.incomingreferral = stringQueryBuilder(incomingreferral);
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

  if (service_type) {
    let queryBuilder = tokenQueryBuilder(service_type, 'code', 'service_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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

  // Appointment search params for DSTU2
  let actor = args['actor'];
  let appointment_type = args['appointment_type'];
  let date = args['date'];
  let identifier = args['identifier'];
  let incomingreferral = args['incomingreferral'];
  let location = args['location'];
  let part_status = args['part_status'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];
  let service_type = args['service_type'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (actor) {
    query.actor = stringQueryBuilder(actor);
  }

  if (appointment_type) {
    let queryBuilder = tokenQueryBuilder(appointment_type, 'code', 'appointment_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
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

  if (incomingreferral) {
    query.incomingreferral = stringQueryBuilder(incomingreferral);
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

  if (service_type) {
    let queryBuilder = tokenQueryBuilder(service_type, 'code', 'service_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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
  logger.info('Appointment >>> search');

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
  let collection = db.collection(`${COLLECTION.APPOINTMENT}_${base_version}`);
  let Appointment = getAppointment(base_version);

  try {
    // Query our collection for this appointment
    const cursor = collection.find(query);
    const appointments = await cursor.toArray();

    appointments.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Appointment(element);
    });

    return toSearchBundle(appointments);
  } catch (err) {
    logger.error('Error with Appointment.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Appointment >>> searchById');

  let { base_version, id } = args;
  let Appointment = getAppointment(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.APPOINTMENT}_${base_version}`);

  try {
    // Query our collection for this appointment
    const appointment = await collection.findOne({ id: id.toString() });

    if (appointment) {
      delete appointment._id;
      return new Appointment(appointment);
    }
    return null;
  } catch (err) {
    logger.error('Error with Appointment.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointment >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENT}_${base_version}`);

    // Get current record
    let Appointment = getAppointment(base_version);
    let appointment = new Appointment(resource);
    delete appointment._id;

    // If no resource ID was provided, generate one.
    let id = appointment.id || getUuid();
    if (!appointment.id) {
      appointment.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    appointment.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(appointment));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Appointment created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointment >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENT}_${base_version}`);

    // Get current record
    let Appointment = getAppointment(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Appointment Class
    let appointment = new Appointment(resource);
    delete appointment._id;
    appointment.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(appointment));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Appointment updated with id: ' + id);
      resolve({
        id: appointment.id,
        created: false,
        resource_version: appointment.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointment >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Appointment deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointment >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Appointment = getAppointment(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.APPOINTMENT}_${base_version}`);

    // Query our collection for this appointment with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((appointment) => {
      if (appointment) {
        delete appointment._id;
        resolve(new Appointment(appointment));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointment >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let actor = args['actor'];
    let appointment_type = args['appointment_type'];
    let date = args['date'];
    let identifier = args['identifier'];
    let incomingreferral = args['incomingreferral'];
    let location = args['location'];
    let part_status = args['part_status'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];
    let service_type = args['service_type'];
    let status = args['status'];

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
    let collection = db.collection(`${COLLECTION.APPOINTMENT}_${base_version}`);
    let Appointment = getAppointment(base_version);

    // Query our collection for appointment history
    collection.find(query).toArray().then((appointments) => {
      appointments.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Appointment(element);
      });
      resolve(appointments);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Appointment >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let actor = args['actor'];
    let appointment_type = args['appointment_type'];
    let date = args['date'];
    let identifier = args['identifier'];
    let incomingreferral = args['incomingreferral'];
    let location = args['location'];
    let part_status = args['part_status'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];
    let service_type = args['service_type'];
    let status = args['status'];

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
    let collection = db.collection(`${COLLECTION.APPOINTMENT}_${base_version}`);
    let Appointment = getAppointment(base_version);

    // Query our collection for appointment history by id
    collection.find(query).toArray().then((appointments) => {
      appointments.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Appointment(element);
      });
      resolve(appointments);
    }).catch(_reject);
  });
