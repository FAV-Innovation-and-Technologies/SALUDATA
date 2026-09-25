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

let getEncounter = (base_version) => {
  return resolveSchema(base_version, 'Encounter');
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

  // Encounter search params
  let appointment = args['appointment'];
  let date = args['date'];
  let diagnosis = args['diagnosis'];
  let episodeofcare = args['episodeofcare'];
  let identifier = args['identifier'];
  let incomingreferral = args['incomingreferral'];
  let length = args['length'];
  let location = args['location'];
  let location_period = args['location_period'];
  let part_of = args['part_of'];
  let participant = args['participant'];
  let participant_type = args['participant_type'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];
  let reason = args['reason'];
  let service_provider = args['service_provider'];
  let special_arrangement = args['special_arrangement'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (appointment) {
    query.appointment = stringQueryBuilder(appointment);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (diagnosis) {
    query.diagnosis = stringQueryBuilder(diagnosis);
  }

  if (episodeofcare) {
    query.episodeofcare = stringQueryBuilder(episodeofcare);
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

  if (length) {
    query.length = stringQueryBuilder(length);
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (location_period) {
    let queryBuilder = dateQueryBuilder(location_period, 'date', 'location_period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
  }

  if (participant_type) {
    let queryBuilder = tokenQueryBuilder(participant_type, 'code', 'participant_type.coding');
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

  if (reason) {
    query.reason = stringQueryBuilder(reason);
  }

  if (service_provider) {
    query.service_provider = stringQueryBuilder(service_provider);
  }

  if (special_arrangement) {
    query.special_arrangement = stringQueryBuilder(special_arrangement);
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

  // Encounter search params for DSTU2
  let appointment = args['appointment'];
  let date = args['date'];
  let diagnosis = args['diagnosis'];
  let episodeofcare = args['episodeofcare'];
  let identifier = args['identifier'];
  let incomingreferral = args['incomingreferral'];
  let length = args['length'];
  let location = args['location'];
  let location_period = args['location_period'];
  let part_of = args['part_of'];
  let participant = args['participant'];
  let participant_type = args['participant_type'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];
  let reason = args['reason'];
  let service_provider = args['service_provider'];
  let special_arrangement = args['special_arrangement'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (appointment) {
    query.appointment = stringQueryBuilder(appointment);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (diagnosis) {
    query.diagnosis = stringQueryBuilder(diagnosis);
  }

  if (episodeofcare) {
    query.episodeofcare = stringQueryBuilder(episodeofcare);
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

  if (length) {
    query.length = stringQueryBuilder(length);
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (location_period) {
    let queryBuilder = dateQueryBuilder(location_period, 'date', 'location_period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
  }

  if (participant_type) {
    let queryBuilder = tokenQueryBuilder(participant_type, 'code', 'participant_type.coding');
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

  if (reason) {
    query.reason = stringQueryBuilder(reason);
  }

  if (service_provider) {
    query.service_provider = stringQueryBuilder(service_provider);
  }

  if (special_arrangement) {
    query.special_arrangement = stringQueryBuilder(special_arrangement);
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
  logger.info('Encounter >>> search');

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
  let collection = db.collection(`${COLLECTION.ENCOUNTER}_${base_version}`);
  let Encounter = getEncounter(base_version);

  try {
    // Query our collection for this encounter
    const cursor = collection.find(query);
    const encounters = await cursor.toArray();

    encounters.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Encounter(element);
    });

    return toSearchBundle(encounters);
  } catch (err) {
    logger.error('Error with Encounter.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Encounter >>> searchById');

  let { base_version, id } = args;
  let Encounter = getEncounter(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ENCOUNTER}_${base_version}`);

  try {
    // Query our collection for this encounter
    const encounter = await collection.findOne({ id: id.toString() });

    if (encounter) {
      delete encounter._id;
      return new Encounter(encounter);
    }
    return null;
  } catch (err) {
    logger.error('Error with Encounter.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Encounter >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENCOUNTER}_${base_version}`);

    // Get current record
    let Encounter = getEncounter(base_version);
    let encounter = new Encounter(resource);
    delete encounter._id;

    // If no resource ID was provided, generate one.
    let id = encounter.id || getUuid();
    if (!encounter.id) {
      encounter.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    encounter.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(encounter));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Encounter created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Encounter >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENCOUNTER}_${base_version}`);

    // Get current record
    let Encounter = getEncounter(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Encounter Class
    let encounter = new Encounter(resource);
    delete encounter._id;
    encounter.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(encounter));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Encounter updated with id: ' + id);
      resolve({
        id: encounter.id,
        created: false,
        resource_version: encounter.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Encounter >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENCOUNTER}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Encounter deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Encounter >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Encounter = getEncounter(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ENCOUNTER}_${base_version}`);

    // Query our collection for this encounter with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((encounter) => {
      if (encounter) {
        delete encounter._id;
        resolve(new Encounter(encounter));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Encounter >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let appointment = args['appointment'];
    let date = args['date'];
    let diagnosis = args['diagnosis'];
    let episodeofcare = args['episodeofcare'];
    let identifier = args['identifier'];
    let incomingreferral = args['incomingreferral'];
    let length = args['length'];
    let location = args['location'];
    let location_period = args['location_period'];
    let part_of = args['part_of'];
    let participant = args['participant'];
    let participant_type = args['participant_type'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];
    let reason = args['reason'];
    let service_provider = args['service_provider'];
    let special_arrangement = args['special_arrangement'];
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
    let collection = db.collection(`${COLLECTION.ENCOUNTER}_${base_version}`);
    let Encounter = getEncounter(base_version);

    // Query our collection for encounter history
    collection.find(query).toArray().then((encounters) => {
      encounters.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Encounter(element);
      });
      resolve(encounters);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Encounter >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let appointment = args['appointment'];
    let date = args['date'];
    let diagnosis = args['diagnosis'];
    let episodeofcare = args['episodeofcare'];
    let identifier = args['identifier'];
    let incomingreferral = args['incomingreferral'];
    let length = args['length'];
    let location = args['location'];
    let location_period = args['location_period'];
    let part_of = args['part_of'];
    let participant = args['participant'];
    let participant_type = args['participant_type'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];
    let reason = args['reason'];
    let service_provider = args['service_provider'];
    let special_arrangement = args['special_arrangement'];
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
    let collection = db.collection(`${COLLECTION.ENCOUNTER}_${base_version}`);
    let Encounter = getEncounter(base_version);

    // Query our collection for encounter history by id
    collection.find(query).toArray().then((encounters) => {
      encounters.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Encounter(element);
      });
      resolve(encounters);
    }).catch(_reject);
  });
