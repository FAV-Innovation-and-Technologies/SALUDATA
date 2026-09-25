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

let getAllergyintolerance = (base_version) => {
  return resolveSchema(base_version, 'Allergyintolerance');
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

  // Allergyintolerance search params
  let asserter = args['asserter'];
  let category = args['category'];
  let clinical_status = args['clinical_status'];
  let code = args['code'];
  let criticality = args['criticality'];
  let date = args['date'];
  let identifier = args['identifier'];
  let last_date = args['last_date'];
  let manifestation = args['manifestation'];
  let onset = args['onset'];
  let allergyIntolerance = args['allergyIntolerance'];
  let recorder = args['recorder'];
  let route = args['route'];
  let severity = args['severity'];
  let type = args['type'];
  let verification_status = args['verification_status'];
  let reporter = args['reporter'];
  let status = args['status'];
  let substance = args['substance'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (asserter) {
    query.asserter = stringQueryBuilder(asserter);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (clinical_status) {
    let queryBuilder = tokenQueryBuilder(clinical_status, 'code', 'clinical_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (criticality) {
    query.criticality = stringQueryBuilder(criticality);
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

  if (last_date) {
    let queryBuilder = dateQueryBuilder(last_date, 'date', 'last_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (manifestation) {
    query.manifestation = stringQueryBuilder(manifestation);
  }

  if (onset) {
    query.onset = stringQueryBuilder(onset);
  }

  if (allergyIntolerance) {
    query.allergyIntolerance = stringQueryBuilder(allergyIntolerance);
  }

  if (recorder) {
    query.recorder = stringQueryBuilder(recorder);
  }

  if (route) {
    query.route = stringQueryBuilder(route);
  }

  if (severity) {
    query.severity = stringQueryBuilder(severity);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (verification_status) {
    let queryBuilder = tokenQueryBuilder(verification_status, 'code', 'verification_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reporter) {
    query.reporter = stringQueryBuilder(reporter);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (substance) {
    query.substance = stringQueryBuilder(substance);
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

  // Allergyintolerance search params for DSTU2
  let asserter = args['asserter'];
  let category = args['category'];
  let clinical_status = args['clinical_status'];
  let code = args['code'];
  let criticality = args['criticality'];
  let date = args['date'];
  let identifier = args['identifier'];
  let last_date = args['last_date'];
  let manifestation = args['manifestation'];
  let onset = args['onset'];
  let allergyIntolerance = args['allergyIntolerance'];
  let recorder = args['recorder'];
  let route = args['route'];
  let severity = args['severity'];
  let type = args['type'];
  let verification_status = args['verification_status'];
  let reporter = args['reporter'];
  let status = args['status'];
  let substance = args['substance'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (asserter) {
    query.asserter = stringQueryBuilder(asserter);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (clinical_status) {
    let queryBuilder = tokenQueryBuilder(clinical_status, 'code', 'clinical_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (criticality) {
    query.criticality = stringQueryBuilder(criticality);
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

  if (last_date) {
    let queryBuilder = dateQueryBuilder(last_date, 'date', 'last_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (manifestation) {
    query.manifestation = stringQueryBuilder(manifestation);
  }

  if (onset) {
    query.onset = stringQueryBuilder(onset);
  }

  if (allergyIntolerance) {
    query.allergyIntolerance = stringQueryBuilder(allergyIntolerance);
  }

  if (recorder) {
    query.recorder = stringQueryBuilder(recorder);
  }

  if (route) {
    query.route = stringQueryBuilder(route);
  }

  if (severity) {
    query.severity = stringQueryBuilder(severity);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (verification_status) {
    let queryBuilder = tokenQueryBuilder(verification_status, 'code', 'verification_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reporter) {
    query.reporter = stringQueryBuilder(reporter);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (substance) {
    query.substance = stringQueryBuilder(substance);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Allergyintolerance >>> search');

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
  let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${base_version}`);
  let Allergyintolerance = getAllergyintolerance(base_version);

  try {
    // Query our collection for this allergyintolerance
    const cursor = collection.find(query);
    const allergyintolerances = await cursor.toArray();

    allergyintolerances.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Allergyintolerance(element);
    });

    return toSearchBundle(allergyintolerances);
  } catch (err) {
    logger.error('Error with Allergyintolerance.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Allergyintolerance >>> searchById');

  let { base_version, id } = args;
  let Allergyintolerance = getAllergyintolerance(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${base_version}`);

  try {
    // Query our collection for this allergyintolerance
    const allergyintolerance = await collection.findOne({ id: id.toString() });

    if (allergyintolerance) {
      delete allergyintolerance._id;
      return new Allergyintolerance(allergyintolerance);
    }
    return null;
  } catch (err) {
    logger.error('Error with Allergyintolerance.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Allergyintolerance >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${base_version}`);

    // Get current record
    let Allergyintolerance = getAllergyintolerance(base_version);
    let allergyintolerance = new Allergyintolerance(resource);
    delete allergyintolerance._id;

    // If no resource ID was provided, generate one.
    let id = allergyintolerance.id || getUuid();
    if (!allergyintolerance.id) {
      allergyintolerance.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    allergyintolerance.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(allergyintolerance));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Allergyintolerance created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Allergyintolerance >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${base_version}`);

    // Get current record
    let Allergyintolerance = getAllergyintolerance(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Allergyintolerance Class
    let allergyintolerance = new Allergyintolerance(resource);
    delete allergyintolerance._id;
    allergyintolerance.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(allergyintolerance));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Allergyintolerance updated with id: ' + id);
      resolve({
        id: allergyintolerance.id,
        created: false,
        resource_version: allergyintolerance.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Allergyintolerance >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Allergyintolerance deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Allergyintolerance >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Allergyintolerance = getAllergyintolerance(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${base_version}`);

    // Query our collection for this allergyintolerance with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((allergyintolerance) => {
      if (allergyintolerance) {
        delete allergyintolerance._id;
        resolve(new Allergyintolerance(allergyintolerance));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Allergyintolerance >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let asserter = args['asserter'];
    let category = args['category'];
    let clinical_status = args['clinical_status'];
    let code = args['code'];
    let criticality = args['criticality'];
    let date = args['date'];
    let identifier = args['identifier'];
    let last_date = args['last_date'];
    let manifestation = args['manifestation'];
    let onset = args['onset'];
    let allergyIntolerance = args['allergyIntolerance'];
    let recorder = args['recorder'];
    let route = args['route'];
    let severity = args['severity'];
    let type = args['type'];
    let verification_status = args['verification_status'];
    let reporter = args['reporter'];
    let status = args['status'];
    let substance = args['substance'];

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
    let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${base_version}`);
    let Allergyintolerance = getAllergyintolerance(base_version);

    // Query our collection for allergyintolerance history
    collection.find(query).toArray().then((allergyintolerances) => {
      allergyintolerances.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Allergyintolerance(element);
      });
      resolve(allergyintolerances);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Allergyintolerance >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let asserter = args['asserter'];
    let category = args['category'];
    let clinical_status = args['clinical_status'];
    let code = args['code'];
    let criticality = args['criticality'];
    let date = args['date'];
    let identifier = args['identifier'];
    let last_date = args['last_date'];
    let manifestation = args['manifestation'];
    let onset = args['onset'];
    let allergyIntolerance = args['allergyIntolerance'];
    let recorder = args['recorder'];
    let route = args['route'];
    let severity = args['severity'];
    let type = args['type'];
    let verification_status = args['verification_status'];
    let reporter = args['reporter'];
    let status = args['status'];
    let substance = args['substance'];

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
    let collection = db.collection(`${COLLECTION.ALLERGYINTOLERANCE}_${base_version}`);
    let Allergyintolerance = getAllergyintolerance(base_version);

    // Query our collection for allergyintolerance history by id
    collection.find(query).toArray().then((allergyintolerances) => {
      allergyintolerances.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Allergyintolerance(element);
      });
      resolve(allergyintolerances);
    }).catch(_reject);
  });
