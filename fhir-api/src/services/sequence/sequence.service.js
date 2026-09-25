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

let getSequence = (base_version) => {
  return resolveSchema(base_version, 'Sequence');
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

  // Sequence search params
  let chromosome = args['chromosome'];
  let coordinate = args['coordinate'];
  let end = args['end'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let start = args['start'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (chromosome) {
    query.chromosome = stringQueryBuilder(chromosome);
  }

  if (coordinate) {
    query.coordinate = stringQueryBuilder(coordinate);
  }

  if (end) {
    query.end = stringQueryBuilder(end);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
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

  if (start) {
    query.start = stringQueryBuilder(start);
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

  // Sequence search params for DSTU2
  let chromosome = args['chromosome'];
  let coordinate = args['coordinate'];
  let end = args['end'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let start = args['start'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (chromosome) {
    query.chromosome = stringQueryBuilder(chromosome);
  }

  if (coordinate) {
    query.coordinate = stringQueryBuilder(coordinate);
  }

  if (end) {
    query.end = stringQueryBuilder(end);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
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

  if (start) {
    query.start = stringQueryBuilder(start);
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
  logger.info('Sequence >>> search');

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
  let collection = db.collection(`${COLLECTION.SEQUENCE}_${base_version}`);
  let Sequence = getSequence(base_version);

  try {
    // Query our collection for this sequence
    const cursor = collection.find(query);
    const sequences = await cursor.toArray();

    sequences.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Sequence(element);
    });

    return toSearchBundle(sequences);
  } catch (err) {
    logger.error('Error with Sequence.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Sequence >>> searchById');

  let { base_version, id } = args;
  let Sequence = getSequence(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.SEQUENCE}_${base_version}`);

  try {
    // Query our collection for this sequence
    const sequence = await collection.findOne({ id: id.toString() });

    if (sequence) {
      delete sequence._id;
      return new Sequence(sequence);
    }
    return null;
  } catch (err) {
    logger.error('Error with Sequence.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Sequence >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEQUENCE}_${base_version}`);

    // Get current record
    let Sequence = getSequence(base_version);
    let sequence = new Sequence(resource);
    delete sequence._id;

    // If no resource ID was provided, generate one.
    let id = sequence.id || getUuid();
    if (!sequence.id) {
      sequence.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    sequence.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(sequence));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Sequence created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Sequence >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEQUENCE}_${base_version}`);

    // Get current record
    let Sequence = getSequence(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Sequence Class
    let sequence = new Sequence(resource);
    delete sequence._id;
    sequence.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(sequence));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Sequence updated with id: ' + id);
      resolve({
        id: sequence.id,
        created: false,
        resource_version: sequence.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Sequence >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEQUENCE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Sequence deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Sequence >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Sequence = getSequence(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SEQUENCE}_${base_version}`);

    // Query our collection for this sequence with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((sequence) => {
      if (sequence) {
        delete sequence._id;
        resolve(new Sequence(sequence));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Sequence >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let chromosome = args['chromosome'];
    let coordinate = args['coordinate'];
    let end = args['end'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let start = args['start'];
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
    let collection = db.collection(`${COLLECTION.SEQUENCE}_${base_version}`);
    let Sequence = getSequence(base_version);

    // Query our collection for sequence history
    collection.find(query).toArray().then((sequences) => {
      sequences.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Sequence(element);
      });
      resolve(sequences);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Sequence >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let chromosome = args['chromosome'];
    let coordinate = args['coordinate'];
    let end = args['end'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let start = args['start'];
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
    let collection = db.collection(`${COLLECTION.SEQUENCE}_${base_version}`);
    let Sequence = getSequence(base_version);

    // Query our collection for sequence history by id
    collection.find(query).toArray().then((sequences) => {
      sequences.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Sequence(element);
      });
      resolve(sequences);
    }).catch(_reject);
  });
