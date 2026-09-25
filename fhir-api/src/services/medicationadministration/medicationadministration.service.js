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

let getMedicationadministration = (base_version) => {
  return resolveSchema(base_version, 'Medicationadministration');
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

  // Medicationadministration search params
  let code = args['code'];
  let device = args['device'];
  let effective_time = args['effective_time'];
  let identifier = args['identifier'];
  let medication = args['medication'];
  let not_given = args['not_given'];
  let patient = args['patient'];
  let performer = args['performer'];
  let prescription = args['prescription'];
  let reason_given = args['reason_given'];
  let reason_not_given = args['reason_not_given'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (effective_time) {
    query.effective_time = stringQueryBuilder(effective_time);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (medication) {
    query.medication = stringQueryBuilder(medication);
  }

  if (not_given) {
    query.not_given = stringQueryBuilder(not_given);
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

  if (prescription) {
    query.prescription = stringQueryBuilder(prescription);
  }

  if (reason_given) {
    query.reason_given = stringQueryBuilder(reason_given);
  }

  if (reason_not_given) {
    query.reason_not_given = stringQueryBuilder(reason_not_given);
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

  // Medicationadministration search params for DSTU2
  let code = args['code'];
  let device = args['device'];
  let effective_time = args['effective_time'];
  let identifier = args['identifier'];
  let medication = args['medication'];
  let not_given = args['not_given'];
  let patient = args['patient'];
  let performer = args['performer'];
  let prescription = args['prescription'];
  let reason_given = args['reason_given'];
  let reason_not_given = args['reason_not_given'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (effective_time) {
    query.effective_time = stringQueryBuilder(effective_time);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (medication) {
    query.medication = stringQueryBuilder(medication);
  }

  if (not_given) {
    query.not_given = stringQueryBuilder(not_given);
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

  if (prescription) {
    query.prescription = stringQueryBuilder(prescription);
  }

  if (reason_given) {
    query.reason_given = stringQueryBuilder(reason_given);
  }

  if (reason_not_given) {
    query.reason_not_given = stringQueryBuilder(reason_not_given);
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
  logger.info('Medicationadministration >>> search');

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
  let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${base_version}`);
  let Medicationadministration = getMedicationadministration(base_version);

  try {
    // Query our collection for this medicationadministration
    const cursor = collection.find(query);
    const medicationadministrations = await cursor.toArray();

    medicationadministrations.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Medicationadministration(element);
    });

    return toSearchBundle(medicationadministrations);
  } catch (err) {
    logger.error('Error with Medicationadministration.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Medicationadministration >>> searchById');

  let { base_version, id } = args;
  let Medicationadministration = getMedicationadministration(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${base_version}`);

  try {
    // Query our collection for this medicationadministration
    const medicationadministration = await collection.findOne({ id: id.toString() });

    if (medicationadministration) {
      delete medicationadministration._id;
      return new Medicationadministration(medicationadministration);
    }
    return null;
  } catch (err) {
    logger.error('Error with Medicationadministration.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationadministration >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${base_version}`);

    // Get current record
    let Medicationadministration = getMedicationadministration(base_version);
    let medicationadministration = new Medicationadministration(resource);
    delete medicationadministration._id;

    // If no resource ID was provided, generate one.
    let id = medicationadministration.id || getUuid();
    if (!medicationadministration.id) {
      medicationadministration.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medicationadministration.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medicationadministration));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Medicationadministration created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationadministration >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${base_version}`);

    // Get current record
    let Medicationadministration = getMedicationadministration(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Medicationadministration Class
    let medicationadministration = new Medicationadministration(resource);
    delete medicationadministration._id;
    medicationadministration.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medicationadministration));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Medicationadministration updated with id: ' + id);
      resolve({
        id: medicationadministration.id,
        created: false,
        resource_version: medicationadministration.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationadministration >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Medicationadministration deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationadministration >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Medicationadministration = getMedicationadministration(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${base_version}`);

    // Query our collection for this medicationadministration with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((medicationadministration) => {
      if (medicationadministration) {
        delete medicationadministration._id;
        resolve(new Medicationadministration(medicationadministration));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationadministration >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let device = args['device'];
    let effective_time = args['effective_time'];
    let identifier = args['identifier'];
    let medication = args['medication'];
    let not_given = args['not_given'];
    let patient = args['patient'];
    let performer = args['performer'];
    let prescription = args['prescription'];
    let reason_given = args['reason_given'];
    let reason_not_given = args['reason_not_given'];
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
    let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${base_version}`);
    let Medicationadministration = getMedicationadministration(base_version);

    // Query our collection for medicationadministration history
    collection.find(query).toArray().then((medicationadministrations) => {
      medicationadministrations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medicationadministration(element);
      });
      resolve(medicationadministrations);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationadministration >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let device = args['device'];
    let effective_time = args['effective_time'];
    let identifier = args['identifier'];
    let medication = args['medication'];
    let not_given = args['not_given'];
    let patient = args['patient'];
    let performer = args['performer'];
    let prescription = args['prescription'];
    let reason_given = args['reason_given'];
    let reason_not_given = args['reason_not_given'];
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
    let collection = db.collection(`${COLLECTION.MEDICATIONADMINISTRATION}_${base_version}`);
    let Medicationadministration = getMedicationadministration(base_version);

    // Query our collection for medicationadministration history by id
    collection.find(query).toArray().then((medicationadministrations) => {
      medicationadministrations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medicationadministration(element);
      });
      resolve(medicationadministrations);
    }).catch(_reject);
  });
