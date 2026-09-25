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

let getSpecimen = (base_version) => {
  return resolveSchema(base_version, 'Specimen');
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

  // Specimen search params
  let accession = args['accession'];
  let bodysite = args['bodysite'];
  let collected = args['collected'];
  let collector = args['collector'];
  let container = args['container'];
  let container_id = args['container_id'];
  let identifier = args['identifier'];
  let parent = args['parent'];
  let patient = args['patient'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (accession) {
    query.accession = stringQueryBuilder(accession);
  }

  if (bodysite) {
    query.bodysite = stringQueryBuilder(bodysite);
  }

  if (collected) {
    query.collected = stringQueryBuilder(collected);
  }

  if (collector) {
    query.collector = stringQueryBuilder(collector);
  }

  if (container) {
    query.container = stringQueryBuilder(container);
  }

  if (container_id) {
    query.container_id = stringQueryBuilder(container_id);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (parent) {
    query.parent = stringQueryBuilder(parent);
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

  // Specimen search params for DSTU2
  let accession = args['accession'];
  let bodysite = args['bodysite'];
  let collected = args['collected'];
  let collector = args['collector'];
  let container = args['container'];
  let container_id = args['container_id'];
  let identifier = args['identifier'];
  let parent = args['parent'];
  let patient = args['patient'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (accession) {
    query.accession = stringQueryBuilder(accession);
  }

  if (bodysite) {
    query.bodysite = stringQueryBuilder(bodysite);
  }

  if (collected) {
    query.collected = stringQueryBuilder(collected);
  }

  if (collector) {
    query.collector = stringQueryBuilder(collector);
  }

  if (container) {
    query.container = stringQueryBuilder(container);
  }

  if (container_id) {
    query.container_id = stringQueryBuilder(container_id);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (parent) {
    query.parent = stringQueryBuilder(parent);
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
  logger.info('Specimen >>> search');

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
  let collection = db.collection(`${COLLECTION.SPECIMEN}_${base_version}`);
  let Specimen = getSpecimen(base_version);

  try {
    // Query our collection for this specimen
    const cursor = collection.find(query);
    const specimens = await cursor.toArray();

    specimens.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Specimen(element);
    });

    return toSearchBundle(specimens);
  } catch (err) {
    logger.error('Error with Specimen.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Specimen >>> searchById');

  let { base_version, id } = args;
  let Specimen = getSpecimen(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.SPECIMEN}_${base_version}`);

  try {
    // Query our collection for this specimen
    const specimen = await collection.findOne({ id: id.toString() });

    if (specimen) {
      delete specimen._id;
      return new Specimen(specimen);
    }
    return null;
  } catch (err) {
    logger.error('Error with Specimen.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Specimen >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SPECIMEN}_${base_version}`);

    // Get current record
    let Specimen = getSpecimen(base_version);
    let specimen = new Specimen(resource);
    delete specimen._id;

    // If no resource ID was provided, generate one.
    let id = specimen.id || getUuid();
    if (!specimen.id) {
      specimen.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    specimen.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(specimen));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Specimen created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Specimen >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SPECIMEN}_${base_version}`);

    // Get current record
    let Specimen = getSpecimen(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Specimen Class
    let specimen = new Specimen(resource);
    delete specimen._id;
    specimen.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(specimen));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Specimen updated with id: ' + id);
      resolve({
        id: specimen.id,
        created: false,
        resource_version: specimen.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Specimen >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SPECIMEN}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Specimen deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Specimen >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Specimen = getSpecimen(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.SPECIMEN}_${base_version}`);

    // Query our collection for this specimen with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((specimen) => {
      if (specimen) {
        delete specimen._id;
        resolve(new Specimen(specimen));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Specimen >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let accession = args['accession'];
    let bodysite = args['bodysite'];
    let collected = args['collected'];
    let collector = args['collector'];
    let container = args['container'];
    let container_id = args['container_id'];
    let identifier = args['identifier'];
    let parent = args['parent'];
    let patient = args['patient'];
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
    let collection = db.collection(`${COLLECTION.SPECIMEN}_${base_version}`);
    let Specimen = getSpecimen(base_version);

    // Query our collection for specimen history
    collection.find(query).toArray().then((specimens) => {
      specimens.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Specimen(element);
      });
      resolve(specimens);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Specimen >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let accession = args['accession'];
    let bodysite = args['bodysite'];
    let collected = args['collected'];
    let collector = args['collector'];
    let container = args['container'];
    let container_id = args['container_id'];
    let identifier = args['identifier'];
    let parent = args['parent'];
    let patient = args['patient'];
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
    let collection = db.collection(`${COLLECTION.SPECIMEN}_${base_version}`);
    let Specimen = getSpecimen(base_version);

    // Query our collection for specimen history by id
    collection.find(query).toArray().then((specimens) => {
      specimens.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Specimen(element);
      });
      resolve(specimens);
    }).catch(_reject);
  });
