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

let getImagingmanifest = (base_version) => {
  return resolveSchema(base_version, 'Imagingmanifest');
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

  // Imagingmanifest search params
  let author = args['author'];
  let authoring_time = args['authoring_time'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let imaging_study = args['imaging_study'];
  let patient = args['patient'];
  let selected_study = args['selected_study'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (authoring_time) {
    query.authoring_time = stringQueryBuilder(authoring_time);
  }

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (imaging_study) {
    query.imaging_study = stringQueryBuilder(imaging_study);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (selected_study) {
    query.selected_study = stringQueryBuilder(selected_study);
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

  // Imagingmanifest search params for DSTU2
  let author = args['author'];
  let authoring_time = args['authoring_time'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let imaging_study = args['imaging_study'];
  let patient = args['patient'];
  let selected_study = args['selected_study'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (authoring_time) {
    query.authoring_time = stringQueryBuilder(authoring_time);
  }

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (imaging_study) {
    query.imaging_study = stringQueryBuilder(imaging_study);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (selected_study) {
    query.selected_study = stringQueryBuilder(selected_study);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Imagingmanifest >>> search');

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
  let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${base_version}`);
  let Imagingmanifest = getImagingmanifest(base_version);

  try {
    // Query our collection for this imagingmanifest
    const cursor = collection.find(query);
    const imagingmanifests = await cursor.toArray();

    imagingmanifests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Imagingmanifest(element);
    });

    return toSearchBundle(imagingmanifests);
  } catch (err) {
    logger.error('Error with Imagingmanifest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Imagingmanifest >>> searchById');

  let { base_version, id } = args;
  let Imagingmanifest = getImagingmanifest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${base_version}`);

  try {
    // Query our collection for this imagingmanifest
    const imagingmanifest = await collection.findOne({ id: id.toString() });

    if (imagingmanifest) {
      delete imagingmanifest._id;
      return new Imagingmanifest(imagingmanifest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Imagingmanifest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingmanifest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${base_version}`);

    // Get current record
    let Imagingmanifest = getImagingmanifest(base_version);
    let imagingmanifest = new Imagingmanifest(resource);
    delete imagingmanifest._id;

    // If no resource ID was provided, generate one.
    let id = imagingmanifest.id || getUuid();
    if (!imagingmanifest.id) {
      imagingmanifest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    imagingmanifest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(imagingmanifest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Imagingmanifest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingmanifest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${base_version}`);

    // Get current record
    let Imagingmanifest = getImagingmanifest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Imagingmanifest Class
    let imagingmanifest = new Imagingmanifest(resource);
    delete imagingmanifest._id;
    imagingmanifest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(imagingmanifest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Imagingmanifest updated with id: ' + id);
      resolve({
        id: imagingmanifest.id,
        created: false,
        resource_version: imagingmanifest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingmanifest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Imagingmanifest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingmanifest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Imagingmanifest = getImagingmanifest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${base_version}`);

    // Query our collection for this imagingmanifest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((imagingmanifest) => {
      if (imagingmanifest) {
        delete imagingmanifest._id;
        resolve(new Imagingmanifest(imagingmanifest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingmanifest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let authoring_time = args['authoring_time'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let imaging_study = args['imaging_study'];
    let patient = args['patient'];
    let selected_study = args['selected_study'];

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
    let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${base_version}`);
    let Imagingmanifest = getImagingmanifest(base_version);

    // Query our collection for imagingmanifest history
    collection.find(query).toArray().then((imagingmanifests) => {
      imagingmanifests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Imagingmanifest(element);
      });
      resolve(imagingmanifests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingmanifest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let authoring_time = args['authoring_time'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let imaging_study = args['imaging_study'];
    let patient = args['patient'];
    let selected_study = args['selected_study'];

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
    let collection = db.collection(`${COLLECTION.IMAGINGMANIFEST}_${base_version}`);
    let Imagingmanifest = getImagingmanifest(base_version);

    // Query our collection for imagingmanifest history by id
    collection.find(query).toArray().then((imagingmanifests) => {
      imagingmanifests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Imagingmanifest(element);
      });
      resolve(imagingmanifests);
    }).catch(_reject);
  });
