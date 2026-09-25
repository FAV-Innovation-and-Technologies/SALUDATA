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

let getImmunization = (base_version) => {
  return resolveSchema(base_version, 'Immunization');
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

  // Immunization search params
  let date = args['date'];
  let dose_sequence = args['dose_sequence'];
  let identifier = args['identifier'];
  let location = args['location'];
  let lot_number = args['lot_number'];
  let manufacturer = args['manufacturer'];
  let notgiven = args['notgiven'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];
  let reaction = args['reaction'];
  let reaction_date = args['reaction_date'];
  let reason = args['reason'];
  let reason_not_given = args['reason_not_given'];
  let status = args['status'];
  let vaccine_code = args['vaccine_code'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (dose_sequence) {
    query.dose_sequence = stringQueryBuilder(dose_sequence);
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

  if (lot_number) {
    query.lot_number = stringQueryBuilder(lot_number);
  }

  if (manufacturer) {
    query.manufacturer = stringQueryBuilder(manufacturer);
  }

  if (notgiven) {
    query.notgiven = stringQueryBuilder(notgiven);
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

  if (reaction) {
    query.reaction = stringQueryBuilder(reaction);
  }

  if (reaction_date) {
    let queryBuilder = dateQueryBuilder(reaction_date, 'date', 'reaction_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reason) {
    query.reason = stringQueryBuilder(reason);
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

  if (vaccine_code) {
    query.vaccine_code = stringQueryBuilder(vaccine_code);
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

  // Immunization search params for DSTU2
  let date = args['date'];
  let dose_sequence = args['dose_sequence'];
  let identifier = args['identifier'];
  let location = args['location'];
  let lot_number = args['lot_number'];
  let manufacturer = args['manufacturer'];
  let notgiven = args['notgiven'];
  let patient = args['patient'];
  let practitioner = args['practitioner'];
  let reaction = args['reaction'];
  let reaction_date = args['reaction_date'];
  let reason = args['reason'];
  let reason_not_given = args['reason_not_given'];
  let status = args['status'];
  let vaccine_code = args['vaccine_code'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (dose_sequence) {
    query.dose_sequence = stringQueryBuilder(dose_sequence);
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

  if (lot_number) {
    query.lot_number = stringQueryBuilder(lot_number);
  }

  if (manufacturer) {
    query.manufacturer = stringQueryBuilder(manufacturer);
  }

  if (notgiven) {
    query.notgiven = stringQueryBuilder(notgiven);
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

  if (reaction) {
    query.reaction = stringQueryBuilder(reaction);
  }

  if (reaction_date) {
    let queryBuilder = dateQueryBuilder(reaction_date, 'date', 'reaction_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reason) {
    query.reason = stringQueryBuilder(reason);
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

  if (vaccine_code) {
    query.vaccine_code = stringQueryBuilder(vaccine_code);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Immunization >>> search');

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
  let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);
  let Immunization = getImmunization(base_version);

  try {
    // Query our collection for this immunization
    const cursor = collection.find(query);
    const immunizations = await cursor.toArray();

    immunizations.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Immunization(element);
    });

    return toSearchBundle(immunizations);
  } catch (err) {
    logger.error('Error with Immunization.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Immunization >>> searchById');

  let { base_version, id } = args;
  let Immunization = getImmunization(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);

  try {
    // Query our collection for this immunization
    const immunization = await collection.findOne({ id: id.toString() });

    if (immunization) {
      delete immunization._id;
      return new Immunization(immunization);
    }
    return null;
  } catch (err) {
    logger.error('Error with Immunization.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunization >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);

    // Get current record
    let Immunization = getImmunization(base_version);
    let immunization = new Immunization(resource);
    delete immunization._id;

    // If no resource ID was provided, generate one.
    let id = immunization.id || getUuid();
    if (!immunization.id) {
      immunization.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    immunization.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(immunization));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Immunization created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunization >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);

    // Get current record
    let Immunization = getImmunization(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Immunization Class
    let immunization = new Immunization(resource);
    delete immunization._id;
    immunization.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(immunization));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Immunization updated with id: ' + id);
      resolve({
        id: immunization.id,
        created: false,
        resource_version: immunization.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunization >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Immunization deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunization >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Immunization = getImmunization(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);

    // Query our collection for this immunization with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((immunization) => {
      if (immunization) {
        delete immunization._id;
        resolve(new Immunization(immunization));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunization >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dose_sequence = args['dose_sequence'];
    let identifier = args['identifier'];
    let location = args['location'];
    let lot_number = args['lot_number'];
    let manufacturer = args['manufacturer'];
    let notgiven = args['notgiven'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];
    let reaction = args['reaction'];
    let reaction_date = args['reaction_date'];
    let reason = args['reason'];
    let reason_not_given = args['reason_not_given'];
    let status = args['status'];
    let vaccine_code = args['vaccine_code'];

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
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);
    let Immunization = getImmunization(base_version);

    // Query our collection for immunization history
    collection.find(query).toArray().then((immunizations) => {
      immunizations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Immunization(element);
      });
      resolve(immunizations);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunization >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dose_sequence = args['dose_sequence'];
    let identifier = args['identifier'];
    let location = args['location'];
    let lot_number = args['lot_number'];
    let manufacturer = args['manufacturer'];
    let notgiven = args['notgiven'];
    let patient = args['patient'];
    let practitioner = args['practitioner'];
    let reaction = args['reaction'];
    let reaction_date = args['reaction_date'];
    let reason = args['reason'];
    let reason_not_given = args['reason_not_given'];
    let status = args['status'];
    let vaccine_code = args['vaccine_code'];

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
    let collection = db.collection(`${COLLECTION.IMMUNIZATION}_${base_version}`);
    let Immunization = getImmunization(base_version);

    // Query our collection for immunization history by id
    collection.find(query).toArray().then((immunizations) => {
      immunizations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Immunization(element);
      });
      resolve(immunizations);
    }).catch(_reject);
  });
