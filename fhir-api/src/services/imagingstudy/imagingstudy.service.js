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

let getImagingstudy = (base_version) => {
  return resolveSchema(base_version, 'Imagingstudy');
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

  // Imagingstudy search params
  let accession = args['accession'];
  let basedon = args['basedon'];
  let bodysite = args['bodysite'];
  let dicom_class = args['dicom_class'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let modality = args['modality'];
  let patient = args['patient'];
  let performer = args['performer'];
  let reason = args['reason'];
  let series = args['series'];
  let started = args['started'];
  let study = args['study'];
  let uid = args['uid'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (accession) {
    query.accession = stringQueryBuilder(accession);
  }

  if (basedon) {
    query.basedon = stringQueryBuilder(basedon);
  }

  if (bodysite) {
    query.bodysite = stringQueryBuilder(bodysite);
  }

  if (dicom_class) {
    query.dicom_class = stringQueryBuilder(dicom_class);
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

  if (modality) {
    query.modality = stringQueryBuilder(modality);
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

  if (reason) {
    query.reason = stringQueryBuilder(reason);
  }

  if (series) {
    query.series = stringQueryBuilder(series);
  }

  if (started) {
    query.started = stringQueryBuilder(started);
  }

  if (study) {
    query.study = stringQueryBuilder(study);
  }

  if (uid) {
    query.uid = stringQueryBuilder(uid);
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

  // Imagingstudy search params for DSTU2
  let accession = args['accession'];
  let basedon = args['basedon'];
  let bodysite = args['bodysite'];
  let dicom_class = args['dicom_class'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let modality = args['modality'];
  let patient = args['patient'];
  let performer = args['performer'];
  let reason = args['reason'];
  let series = args['series'];
  let started = args['started'];
  let study = args['study'];
  let uid = args['uid'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (accession) {
    query.accession = stringQueryBuilder(accession);
  }

  if (basedon) {
    query.basedon = stringQueryBuilder(basedon);
  }

  if (bodysite) {
    query.bodysite = stringQueryBuilder(bodysite);
  }

  if (dicom_class) {
    query.dicom_class = stringQueryBuilder(dicom_class);
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

  if (modality) {
    query.modality = stringQueryBuilder(modality);
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

  if (reason) {
    query.reason = stringQueryBuilder(reason);
  }

  if (series) {
    query.series = stringQueryBuilder(series);
  }

  if (started) {
    query.started = stringQueryBuilder(started);
  }

  if (study) {
    query.study = stringQueryBuilder(study);
  }

  if (uid) {
    query.uid = stringQueryBuilder(uid);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Imagingstudy >>> search');

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
  let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${base_version}`);
  let Imagingstudy = getImagingstudy(base_version);

  try {
    // Query our collection for this imagingstudy
    const cursor = collection.find(query);
    const imagingstudys = await cursor.toArray();

    imagingstudys.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Imagingstudy(element);
    });

    return toSearchBundle(imagingstudys);
  } catch (err) {
    logger.error('Error with Imagingstudy.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Imagingstudy >>> searchById');

  let { base_version, id } = args;
  let Imagingstudy = getImagingstudy(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${base_version}`);

  try {
    // Query our collection for this imagingstudy
    const imagingstudy = await collection.findOne({ id: id.toString() });

    if (imagingstudy) {
      delete imagingstudy._id;
      return new Imagingstudy(imagingstudy);
    }
    return null;
  } catch (err) {
    logger.error('Error with Imagingstudy.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingstudy >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${base_version}`);

    // Get current record
    let Imagingstudy = getImagingstudy(base_version);
    let imagingstudy = new Imagingstudy(resource);
    delete imagingstudy._id;

    // If no resource ID was provided, generate one.
    let id = imagingstudy.id || getUuid();
    if (!imagingstudy.id) {
      imagingstudy.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    imagingstudy.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(imagingstudy));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Imagingstudy created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingstudy >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${base_version}`);

    // Get current record
    let Imagingstudy = getImagingstudy(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Imagingstudy Class
    let imagingstudy = new Imagingstudy(resource);
    delete imagingstudy._id;
    imagingstudy.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(imagingstudy));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Imagingstudy updated with id: ' + id);
      resolve({
        id: imagingstudy.id,
        created: false,
        resource_version: imagingstudy.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingstudy >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Imagingstudy deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingstudy >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Imagingstudy = getImagingstudy(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${base_version}`);

    // Query our collection for this imagingstudy with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((imagingstudy) => {
      if (imagingstudy) {
        delete imagingstudy._id;
        resolve(new Imagingstudy(imagingstudy));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingstudy >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let accession = args['accession'];
    let basedon = args['basedon'];
    let bodysite = args['bodysite'];
    let dicom_class = args['dicom_class'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let modality = args['modality'];
    let patient = args['patient'];
    let performer = args['performer'];
    let reason = args['reason'];
    let series = args['series'];
    let started = args['started'];
    let study = args['study'];
    let uid = args['uid'];

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
    let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${base_version}`);
    let Imagingstudy = getImagingstudy(base_version);

    // Query our collection for imagingstudy history
    collection.find(query).toArray().then((imagingstudys) => {
      imagingstudys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Imagingstudy(element);
      });
      resolve(imagingstudys);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Imagingstudy >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let accession = args['accession'];
    let basedon = args['basedon'];
    let bodysite = args['bodysite'];
    let dicom_class = args['dicom_class'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let modality = args['modality'];
    let patient = args['patient'];
    let performer = args['performer'];
    let reason = args['reason'];
    let series = args['series'];
    let started = args['started'];
    let study = args['study'];
    let uid = args['uid'];

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
    let collection = db.collection(`${COLLECTION.IMAGINGSTUDY}_${base_version}`);
    let Imagingstudy = getImagingstudy(base_version);

    // Query our collection for imagingstudy history by id
    collection.find(query).toArray().then((imagingstudys) => {
      imagingstudys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Imagingstudy(element);
      });
      resolve(imagingstudys);
    }).catch(_reject);
  });
