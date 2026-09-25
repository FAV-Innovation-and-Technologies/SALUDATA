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

let getNutritionorder = (base_version) => {
  return resolveSchema(base_version, 'Nutritionorder');
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

  // Nutritionorder search params
  let additive = args['additive'];
  let datetime = args['datetime'];
  let encounter = args['encounter'];
  let formula = args['formula'];
  let identifier = args['identifier'];
  let oraldiet = args['oraldiet'];
  let patient = args['patient'];
  let provider = args['provider'];
  let status = args['status'];
  let supplement = args['supplement'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (additive) {
    query.additive = stringQueryBuilder(additive);
  }

  if (datetime) {
    let queryBuilder = dateQueryBuilder(datetime, 'date', 'datetime');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (formula) {
    query.formula = stringQueryBuilder(formula);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (oraldiet) {
    query.oraldiet = stringQueryBuilder(oraldiet);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (supplement) {
    query.supplement = stringQueryBuilder(supplement);
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

  // Nutritionorder search params for DSTU2
  let additive = args['additive'];
  let datetime = args['datetime'];
  let encounter = args['encounter'];
  let formula = args['formula'];
  let identifier = args['identifier'];
  let oraldiet = args['oraldiet'];
  let patient = args['patient'];
  let provider = args['provider'];
  let status = args['status'];
  let supplement = args['supplement'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (additive) {
    query.additive = stringQueryBuilder(additive);
  }

  if (datetime) {
    let queryBuilder = dateQueryBuilder(datetime, 'date', 'datetime');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (formula) {
    query.formula = stringQueryBuilder(formula);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (oraldiet) {
    query.oraldiet = stringQueryBuilder(oraldiet);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (supplement) {
    query.supplement = stringQueryBuilder(supplement);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Nutritionorder >>> search');

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
  let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${base_version}`);
  let Nutritionorder = getNutritionorder(base_version);

  try {
    // Query our collection for this nutritionorder
    const cursor = collection.find(query);
    const nutritionorders = await cursor.toArray();

    nutritionorders.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Nutritionorder(element);
    });

    return toSearchBundle(nutritionorders);
  } catch (err) {
    logger.error('Error with Nutritionorder.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Nutritionorder >>> searchById');

  let { base_version, id } = args;
  let Nutritionorder = getNutritionorder(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${base_version}`);

  try {
    // Query our collection for this nutritionorder
    const nutritionorder = await collection.findOne({ id: id.toString() });

    if (nutritionorder) {
      delete nutritionorder._id;
      return new Nutritionorder(nutritionorder);
    }
    return null;
  } catch (err) {
    logger.error('Error with Nutritionorder.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Nutritionorder >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${base_version}`);

    // Get current record
    let Nutritionorder = getNutritionorder(base_version);
    let nutritionorder = new Nutritionorder(resource);
    delete nutritionorder._id;

    // If no resource ID was provided, generate one.
    let id = nutritionorder.id || getUuid();
    if (!nutritionorder.id) {
      nutritionorder.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    nutritionorder.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(nutritionorder));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Nutritionorder created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Nutritionorder >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${base_version}`);

    // Get current record
    let Nutritionorder = getNutritionorder(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Nutritionorder Class
    let nutritionorder = new Nutritionorder(resource);
    delete nutritionorder._id;
    nutritionorder.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(nutritionorder));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Nutritionorder updated with id: ' + id);
      resolve({
        id: nutritionorder.id,
        created: false,
        resource_version: nutritionorder.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Nutritionorder >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Nutritionorder deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Nutritionorder >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Nutritionorder = getNutritionorder(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${base_version}`);

    // Query our collection for this nutritionorder with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((nutritionorder) => {
      if (nutritionorder) {
        delete nutritionorder._id;
        resolve(new Nutritionorder(nutritionorder));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Nutritionorder >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let additive = args['additive'];
    let datetime = args['datetime'];
    let encounter = args['encounter'];
    let formula = args['formula'];
    let identifier = args['identifier'];
    let oraldiet = args['oraldiet'];
    let patient = args['patient'];
    let provider = args['provider'];
    let status = args['status'];
    let supplement = args['supplement'];

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
    let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${base_version}`);
    let Nutritionorder = getNutritionorder(base_version);

    // Query our collection for nutritionorder history
    collection.find(query).toArray().then((nutritionorders) => {
      nutritionorders.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Nutritionorder(element);
      });
      resolve(nutritionorders);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Nutritionorder >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let additive = args['additive'];
    let datetime = args['datetime'];
    let encounter = args['encounter'];
    let formula = args['formula'];
    let identifier = args['identifier'];
    let oraldiet = args['oraldiet'];
    let patient = args['patient'];
    let provider = args['provider'];
    let status = args['status'];
    let supplement = args['supplement'];

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
    let collection = db.collection(`${COLLECTION.NUTRITIONORDER}_${base_version}`);
    let Nutritionorder = getNutritionorder(base_version);

    // Query our collection for nutritionorder history by id
    collection.find(query).toArray().then((nutritionorders) => {
      nutritionorders.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Nutritionorder(element);
      });
      resolve(nutritionorders);
    }).catch(_reject);
  });
