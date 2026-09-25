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

let getCareteam = (base_version) => {
  return resolveSchema(base_version, 'Careteam');
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

  // Careteam search params
  let category = args['category'];
  let date = args['date'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let participant = args['participant'];
  let patient = args['patient'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
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

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
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

  // Careteam search params for DSTU2
  let category = args['category'];
  let date = args['date'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let participant = args['participant'];
  let patient = args['patient'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
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

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (participant) {
    query.participant = stringQueryBuilder(participant);
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
  logger.info('Careteam >>> search');

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
  let collection = db.collection(`${COLLECTION.CARETEAM}_${base_version}`);
  let Careteam = getCareteam(base_version);

  try {
    // Query our collection for this careteam
    const cursor = collection.find(query);
    const careteams = await cursor.toArray();

    careteams.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Careteam(element);
    });

    return toSearchBundle(careteams);
  } catch (err) {
    logger.error('Error with Careteam.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Careteam >>> searchById');

  let { base_version, id } = args;
  let Careteam = getCareteam(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CARETEAM}_${base_version}`);

  try {
    // Query our collection for this careteam
    const careteam = await collection.findOne({ id: id.toString() });

    if (careteam) {
      delete careteam._id;
      return new Careteam(careteam);
    }
    return null;
  } catch (err) {
    logger.error('Error with Careteam.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Careteam >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CARETEAM}_${base_version}`);

    // Get current record
    let Careteam = getCareteam(base_version);
    let careteam = new Careteam(resource);
    delete careteam._id;

    // If no resource ID was provided, generate one.
    let id = careteam.id || getUuid();
    if (!careteam.id) {
      careteam.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    careteam.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(careteam));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Careteam created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Careteam >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CARETEAM}_${base_version}`);

    // Get current record
    let Careteam = getCareteam(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Careteam Class
    let careteam = new Careteam(resource);
    delete careteam._id;
    careteam.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(careteam));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Careteam updated with id: ' + id);
      resolve({
        id: careteam.id,
        created: false,
        resource_version: careteam.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careteam >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CARETEAM}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Careteam deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careteam >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Careteam = getCareteam(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CARETEAM}_${base_version}`);

    // Query our collection for this careteam with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((careteam) => {
      if (careteam) {
        delete careteam._id;
        resolve(new Careteam(careteam));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careteam >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let date = args['date'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let participant = args['participant'];
    let patient = args['patient'];
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
    let collection = db.collection(`${COLLECTION.CARETEAM}_${base_version}`);
    let Careteam = getCareteam(base_version);

    // Query our collection for careteam history
    collection.find(query).toArray().then((careteams) => {
      careteams.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Careteam(element);
      });
      resolve(careteams);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Careteam >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let date = args['date'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let participant = args['participant'];
    let patient = args['patient'];
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
    let collection = db.collection(`${COLLECTION.CARETEAM}_${base_version}`);
    let Careteam = getCareteam(base_version);

    // Query our collection for careteam history by id
    collection.find(query).toArray().then((careteams) => {
      careteams.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Careteam(element);
      });
      resolve(careteams);
    }).catch(_reject);
  });
