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

let getMedia = (base_version) => {
  return resolveSchema(base_version, 'Media');
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

  // Media search params
  let based_on = args['based_on'];
  let created = args['created'];
  let date = args['date'];
  let device = args['device'];
  let identifier = args['identifier'];
  let operator = args['operator'];
  let patient = args['patient'];
  let site = args['site'];
  let subject = args['subject'];
  let subtype = args['subtype'];
  let type = args['type'];
  let view = args['view'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (operator) {
    query.operator = stringQueryBuilder(operator);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (site) {
    query.site = stringQueryBuilder(site);
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subtype) {
    let queryBuilder = tokenQueryBuilder(subtype, 'code', 'subtype.coding');
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

  if (view) {
    query.view = stringQueryBuilder(view);
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

  // Media search params for DSTU2
  let based_on = args['based_on'];
  let created = args['created'];
  let date = args['date'];
  let device = args['device'];
  let identifier = args['identifier'];
  let operator = args['operator'];
  let patient = args['patient'];
  let site = args['site'];
  let subject = args['subject'];
  let subtype = args['subtype'];
  let type = args['type'];
  let view = args['view'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (operator) {
    query.operator = stringQueryBuilder(operator);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (site) {
    query.site = stringQueryBuilder(site);
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subtype) {
    let queryBuilder = tokenQueryBuilder(subtype, 'code', 'subtype.coding');
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

  if (view) {
    query.view = stringQueryBuilder(view);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Media >>> search');

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
  let collection = db.collection(`${COLLECTION.MEDIA}_${base_version}`);
  let Media = getMedia(base_version);

  try {
    // Query our collection for this media
    const cursor = collection.find(query);
    const medias = await cursor.toArray();

    medias.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Media(element);
    });

    return toSearchBundle(medias);
  } catch (err) {
    logger.error('Error with Media.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Media >>> searchById');

  let { base_version, id } = args;
  let Media = getMedia(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.MEDIA}_${base_version}`);

  try {
    // Query our collection for this media
    const media = await collection.findOne({ id: id.toString() });

    if (media) {
      delete media._id;
      return new Media(media);
    }
    return null;
  } catch (err) {
    logger.error('Error with Media.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Media >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDIA}_${base_version}`);

    // Get current record
    let Media = getMedia(base_version);
    let media = new Media(resource);
    delete media._id;

    // If no resource ID was provided, generate one.
    let id = media.id || getUuid();
    if (!media.id) {
      media.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    media.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(media));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Media created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Media >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDIA}_${base_version}`);

    // Get current record
    let Media = getMedia(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Media Class
    let media = new Media(resource);
    delete media._id;
    media.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(media));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Media updated with id: ' + id);
      resolve({
        id: media.id,
        created: false,
        resource_version: media.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Media >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDIA}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Media deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Media >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Media = getMedia(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDIA}_${base_version}`);

    // Query our collection for this media with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((media) => {
      if (media) {
        delete media._id;
        resolve(new Media(media));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Media >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let based_on = args['based_on'];
    let created = args['created'];
    let date = args['date'];
    let device = args['device'];
    let identifier = args['identifier'];
    let operator = args['operator'];
    let patient = args['patient'];
    let site = args['site'];
    let subject = args['subject'];
    let subtype = args['subtype'];
    let type = args['type'];
    let view = args['view'];

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
    let collection = db.collection(`${COLLECTION.MEDIA}_${base_version}`);
    let Media = getMedia(base_version);

    // Query our collection for media history
    collection.find(query).toArray().then((medias) => {
      medias.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Media(element);
      });
      resolve(medias);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Media >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let based_on = args['based_on'];
    let created = args['created'];
    let date = args['date'];
    let device = args['device'];
    let identifier = args['identifier'];
    let operator = args['operator'];
    let patient = args['patient'];
    let site = args['site'];
    let subject = args['subject'];
    let subtype = args['subtype'];
    let type = args['type'];
    let view = args['view'];

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
    let collection = db.collection(`${COLLECTION.MEDIA}_${base_version}`);
    let Media = getMedia(base_version);

    // Query our collection for media history by id
    collection.find(query).toArray().then((medias) => {
      medias.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Media(element);
      });
      resolve(medias);
    }).catch(_reject);
  });
