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

let getMedication = (base_version) => {
  return resolveSchema(base_version, 'Medication');
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

  // Medication search params
  let code = args['code'];
  let container = args['container'];
  let form = args['form'];
  let ingredient = args['ingredient'];
  let ingredient_code = args['ingredient_code'];
  let manufacturer = args['manufacturer'];
  let over_the_counter = args['over_the_counter'];
  let package_item = args['package_item'];
  let package_item_code = args['package_item_code'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (container) {
    query.container = stringQueryBuilder(container);
  }

  if (form) {
    query.form = stringQueryBuilder(form);
  }

  if (ingredient) {
    query.ingredient = stringQueryBuilder(ingredient);
  }

  if (ingredient_code) {
    query.ingredient_code = stringQueryBuilder(ingredient_code);
  }

  if (manufacturer) {
    query.manufacturer = stringQueryBuilder(manufacturer);
  }

  if (over_the_counter) {
    query.over_the_counter = stringQueryBuilder(over_the_counter);
  }

  if (package_item) {
    query.package_item = stringQueryBuilder(package_item);
  }

  if (package_item_code) {
    query.package_item_code = stringQueryBuilder(package_item_code);
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

  // Medication search params for DSTU2
  let code = args['code'];
  let container = args['container'];
  let form = args['form'];
  let ingredient = args['ingredient'];
  let ingredient_code = args['ingredient_code'];
  let manufacturer = args['manufacturer'];
  let over_the_counter = args['over_the_counter'];
  let package_item = args['package_item'];
  let package_item_code = args['package_item_code'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (container) {
    query.container = stringQueryBuilder(container);
  }

  if (form) {
    query.form = stringQueryBuilder(form);
  }

  if (ingredient) {
    query.ingredient = stringQueryBuilder(ingredient);
  }

  if (ingredient_code) {
    query.ingredient_code = stringQueryBuilder(ingredient_code);
  }

  if (manufacturer) {
    query.manufacturer = stringQueryBuilder(manufacturer);
  }

  if (over_the_counter) {
    query.over_the_counter = stringQueryBuilder(over_the_counter);
  }

  if (package_item) {
    query.package_item = stringQueryBuilder(package_item);
  }

  if (package_item_code) {
    query.package_item_code = stringQueryBuilder(package_item_code);
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
  logger.info('Medication >>> search');

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
  let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);
  let Medication = getMedication(base_version);

  try {
    // Query our collection for this medication
    const cursor = collection.find(query);
    const medications = await cursor.toArray();

    medications.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Medication(element);
    });

    return toSearchBundle(medications);
  } catch (err) {
    logger.error('Error with Medication.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Medication >>> searchById');

  let { base_version, id } = args;
  let Medication = getMedication(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);

  try {
    // Query our collection for this medication
    const medication = await collection.findOne({ id: id.toString() });

    if (medication) {
      delete medication._id;
      return new Medication(medication);
    }
    return null;
  } catch (err) {
    logger.error('Error with Medication.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medication >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);

    // Get current record
    let Medication = getMedication(base_version);
    let medication = new Medication(resource);
    delete medication._id;

    // If no resource ID was provided, generate one.
    let id = medication.id || getUuid();
    if (!medication.id) {
      medication.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medication.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medication));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Medication created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medication >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);

    // Get current record
    let Medication = getMedication(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Medication Class
    let medication = new Medication(resource);
    delete medication._id;
    medication.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medication));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Medication updated with id: ' + id);
      resolve({
        id: medication.id,
        created: false,
        resource_version: medication.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medication >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Medication deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medication >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Medication = getMedication(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);

    // Query our collection for this medication with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((medication) => {
      if (medication) {
        delete medication._id;
        resolve(new Medication(medication));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medication >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let container = args['container'];
    let form = args['form'];
    let ingredient = args['ingredient'];
    let ingredient_code = args['ingredient_code'];
    let manufacturer = args['manufacturer'];
    let over_the_counter = args['over_the_counter'];
    let package_item = args['package_item'];
    let package_item_code = args['package_item_code'];
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
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);
    let Medication = getMedication(base_version);

    // Query our collection for medication history
    collection.find(query).toArray().then((medications) => {
      medications.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medication(element);
      });
      resolve(medications);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medication >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let container = args['container'];
    let form = args['form'];
    let ingredient = args['ingredient'];
    let ingredient_code = args['ingredient_code'];
    let manufacturer = args['manufacturer'];
    let over_the_counter = args['over_the_counter'];
    let package_item = args['package_item'];
    let package_item_code = args['package_item_code'];
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
    let collection = db.collection(`${COLLECTION.MEDICATION}_${base_version}`);
    let Medication = getMedication(base_version);

    // Query our collection for medication history by id
    collection.find(query).toArray().then((medications) => {
      medications.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medication(element);
      });
      resolve(medications);
    }).catch(_reject);
  });
