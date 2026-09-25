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

let getCareplan = (base_version) => {
  return resolveSchema(base_version, 'Careplan');
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

  // Careplan search params
  let activity_code = args['activity_code'];
  let activity_date = args['activity_date'];
  let activity_reference = args['activity_reference'];
  let based_on = args['based_on'];
  let care_team = args['care_team'];
  let category = args['category'];
  let condition = args['condition'];
  let date = args['date'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let goal = args['goal'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let part_of = args['part_of'];
  let patient = args['patient'];
  let performer = args['performer'];
  let replaces = args['replaces'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (activity_code) {
    query.activity_code = stringQueryBuilder(activity_code);
  }

  if (activity_date) {
    let queryBuilder = dateQueryBuilder(activity_date, 'date', 'activity_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (activity_reference) {
    query.activity_reference = stringQueryBuilder(activity_reference);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (care_team) {
    query.care_team = stringQueryBuilder(care_team);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (condition) {
    query.condition = stringQueryBuilder(condition);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (goal) {
    query.goal = stringQueryBuilder(goal);
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

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
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

  if (replaces) {
    query.replaces = stringQueryBuilder(replaces);
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

  // Careplan search params for DSTU2
  let activity_code = args['activity_code'];
  let activity_date = args['activity_date'];
  let activity_reference = args['activity_reference'];
  let based_on = args['based_on'];
  let care_team = args['care_team'];
  let category = args['category'];
  let condition = args['condition'];
  let date = args['date'];
  let definition = args['definition'];
  let encounter = args['encounter'];
  let goal = args['goal'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let part_of = args['part_of'];
  let patient = args['patient'];
  let performer = args['performer'];
  let replaces = args['replaces'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (activity_code) {
    query.activity_code = stringQueryBuilder(activity_code);
  }

  if (activity_date) {
    let queryBuilder = dateQueryBuilder(activity_date, 'date', 'activity_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (activity_reference) {
    query.activity_reference = stringQueryBuilder(activity_reference);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (care_team) {
    query.care_team = stringQueryBuilder(care_team);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (condition) {
    query.condition = stringQueryBuilder(condition);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (definition) {
    query.definition = stringQueryBuilder(definition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (goal) {
    query.goal = stringQueryBuilder(goal);
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

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
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

  if (replaces) {
    query.replaces = stringQueryBuilder(replaces);
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
  logger.info('Careplan >>> search');

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
  let collection = db.collection(`${COLLECTION.CAREPLAN}_${base_version}`);
  let Careplan = getCareplan(base_version);

  try {
    // Query our collection for this careplan
    const cursor = collection.find(query);
    const careplans = await cursor.toArray();

    careplans.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Careplan(element);
    });

    return toSearchBundle(careplans);
  } catch (err) {
    logger.error('Error with Careplan.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Careplan >>> searchById');

  let { base_version, id } = args;
  let Careplan = getCareplan(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CAREPLAN}_${base_version}`);

  try {
    // Query our collection for this careplan
    const careplan = await collection.findOne({ id: id.toString() });

    if (careplan) {
      delete careplan._id;
      return new Careplan(careplan);
    }
    return null;
  } catch (err) {
    logger.error('Error with Careplan.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Careplan >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAREPLAN}_${base_version}`);

    // Get current record
    let Careplan = getCareplan(base_version);
    let careplan = new Careplan(resource);
    delete careplan._id;

    // If no resource ID was provided, generate one.
    let id = careplan.id || getUuid();
    if (!careplan.id) {
      careplan.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    careplan.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(careplan));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Careplan created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Careplan >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAREPLAN}_${base_version}`);

    // Get current record
    let Careplan = getCareplan(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Careplan Class
    let careplan = new Careplan(resource);
    delete careplan._id;
    careplan.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(careplan));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Careplan updated with id: ' + id);
      resolve({
        id: careplan.id,
        created: false,
        resource_version: careplan.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careplan >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAREPLAN}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Careplan deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careplan >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Careplan = getCareplan(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CAREPLAN}_${base_version}`);

    // Query our collection for this careplan with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((careplan) => {
      if (careplan) {
        delete careplan._id;
        resolve(new Careplan(careplan));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careplan >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let activity_code = args['activity_code'];
    let activity_date = args['activity_date'];
    let activity_reference = args['activity_reference'];
    let based_on = args['based_on'];
    let care_team = args['care_team'];
    let category = args['category'];
    let condition = args['condition'];
    let date = args['date'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let goal = args['goal'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let part_of = args['part_of'];
    let patient = args['patient'];
    let performer = args['performer'];
    let replaces = args['replaces'];
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
    let collection = db.collection(`${COLLECTION.CAREPLAN}_${base_version}`);
    let Careplan = getCareplan(base_version);

    // Query our collection for careplan history
    collection.find(query).toArray().then((careplans) => {
      careplans.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Careplan(element);
      });
      resolve(careplans);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careplan >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let activity_code = args['activity_code'];
    let activity_date = args['activity_date'];
    let activity_reference = args['activity_reference'];
    let based_on = args['based_on'];
    let care_team = args['care_team'];
    let category = args['category'];
    let condition = args['condition'];
    let date = args['date'];
    let definition = args['definition'];
    let encounter = args['encounter'];
    let goal = args['goal'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let part_of = args['part_of'];
    let patient = args['patient'];
    let performer = args['performer'];
    let replaces = args['replaces'];
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
    let collection = db.collection(`${COLLECTION.CAREPLAN}_${base_version}`);
    let Careplan = getCareplan(base_version);

    // Query our collection for careplan history by id
    collection.find(query).toArray().then((careplans) => {
      careplans.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Careplan(element);
      });
      resolve(careplans);
    }).catch(_reject);
  });
