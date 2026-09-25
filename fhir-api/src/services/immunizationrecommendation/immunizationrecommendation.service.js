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

let getImmunizationrecommendation = (base_version) => {
  return resolveSchema(base_version, 'Immunizationrecommendation');
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

  // Immunizationrecommendation search params
  let date = args['date'];
  let dose_number = args['dose_number'];
  let dose_sequence = args['dose_sequence'];
  let identifier = args['identifier'];
  let information = args['information'];
  let patient = args['patient'];
  let status = args['status'];
  let support = args['support'];
  let target_disease = args['target_disease'];
  let vaccine_type = args['vaccine_type'];

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

  if (dose_number) {
    query.dose_number = stringQueryBuilder(dose_number);
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

  if (information) {
    query.information = stringQueryBuilder(information);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
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

  if (support) {
    query.support = stringQueryBuilder(support);
  }

  if (target_disease) {
    query.target_disease = stringQueryBuilder(target_disease);
  }

  if (vaccine_type) {
    let queryBuilder = tokenQueryBuilder(vaccine_type, 'code', 'vaccine_type.coding');
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

  // Immunizationrecommendation search params for DSTU2
  let date = args['date'];
  let dose_number = args['dose_number'];
  let dose_sequence = args['dose_sequence'];
  let identifier = args['identifier'];
  let information = args['information'];
  let patient = args['patient'];
  let status = args['status'];
  let support = args['support'];
  let target_disease = args['target_disease'];
  let vaccine_type = args['vaccine_type'];

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

  if (dose_number) {
    query.dose_number = stringQueryBuilder(dose_number);
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

  if (information) {
    query.information = stringQueryBuilder(information);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
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

  if (support) {
    query.support = stringQueryBuilder(support);
  }

  if (target_disease) {
    query.target_disease = stringQueryBuilder(target_disease);
  }

  if (vaccine_type) {
    let queryBuilder = tokenQueryBuilder(vaccine_type, 'code', 'vaccine_type.coding');
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
  logger.info('Immunizationrecommendation >>> search');

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
  let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${base_version}`);
  let Immunizationrecommendation = getImmunizationrecommendation(base_version);

  try {
    // Query our collection for this immunizationrecommendation
    const cursor = collection.find(query);
    const immunizationrecommendations = await cursor.toArray();

    immunizationrecommendations.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Immunizationrecommendation(element);
    });

    return toSearchBundle(immunizationrecommendations);
  } catch (err) {
    logger.error('Error with Immunizationrecommendation.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Immunizationrecommendation >>> searchById');

  let { base_version, id } = args;
  let Immunizationrecommendation = getImmunizationrecommendation(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${base_version}`);

  try {
    // Query our collection for this immunizationrecommendation
    const immunizationrecommendation = await collection.findOne({ id: id.toString() });

    if (immunizationrecommendation) {
      delete immunizationrecommendation._id;
      return new Immunizationrecommendation(immunizationrecommendation);
    }
    return null;
  } catch (err) {
    logger.error('Error with Immunizationrecommendation.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunizationrecommendation >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${base_version}`);

    // Get current record
    let Immunizationrecommendation = getImmunizationrecommendation(base_version);
    let immunizationrecommendation = new Immunizationrecommendation(resource);
    delete immunizationrecommendation._id;

    // If no resource ID was provided, generate one.
    let id = immunizationrecommendation.id || getUuid();
    if (!immunizationrecommendation.id) {
      immunizationrecommendation.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    immunizationrecommendation.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(immunizationrecommendation));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Immunizationrecommendation created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunizationrecommendation >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${base_version}`);

    // Get current record
    let Immunizationrecommendation = getImmunizationrecommendation(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Immunizationrecommendation Class
    let immunizationrecommendation = new Immunizationrecommendation(resource);
    delete immunizationrecommendation._id;
    immunizationrecommendation.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(immunizationrecommendation));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Immunizationrecommendation updated with id: ' + id);
      resolve({
        id: immunizationrecommendation.id,
        created: false,
        resource_version: immunizationrecommendation.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunizationrecommendation >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Immunizationrecommendation deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunizationrecommendation >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Immunizationrecommendation = getImmunizationrecommendation(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${base_version}`);

    // Query our collection for this immunizationrecommendation with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((immunizationrecommendation) => {
      if (immunizationrecommendation) {
        delete immunizationrecommendation._id;
        resolve(new Immunizationrecommendation(immunizationrecommendation));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunizationrecommendation >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dose_number = args['dose_number'];
    let dose_sequence = args['dose_sequence'];
    let identifier = args['identifier'];
    let information = args['information'];
    let patient = args['patient'];
    let status = args['status'];
    let support = args['support'];
    let target_disease = args['target_disease'];
    let vaccine_type = args['vaccine_type'];

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
    let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${base_version}`);
    let Immunizationrecommendation = getImmunizationrecommendation(base_version);

    // Query our collection for immunizationrecommendation history
    collection.find(query).toArray().then((immunizationrecommendations) => {
      immunizationrecommendations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Immunizationrecommendation(element);
      });
      resolve(immunizationrecommendations);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Immunizationrecommendation >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let date = args['date'];
    let dose_number = args['dose_number'];
    let dose_sequence = args['dose_sequence'];
    let identifier = args['identifier'];
    let information = args['information'];
    let patient = args['patient'];
    let status = args['status'];
    let support = args['support'];
    let target_disease = args['target_disease'];
    let vaccine_type = args['vaccine_type'];

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
    let collection = db.collection(`${COLLECTION.IMMUNIZATIONRECOMMENDATION}_${base_version}`);
    let Immunizationrecommendation = getImmunizationrecommendation(base_version);

    // Query our collection for immunizationrecommendation history by id
    collection.find(query).toArray().then((immunizationrecommendations) => {
      immunizationrecommendations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Immunizationrecommendation(element);
      });
      resolve(immunizationrecommendations);
    }).catch(_reject);
  });
