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

let getMessageheader = (base_version) => {
  return resolveSchema(base_version, 'Messageheader');
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

  // Messageheader search params
  let author = args['author'];
  let code = args['code'];
  let destination = args['destination'];
  let destination_uri = args['destination_uri'];
  let enterer = args['enterer'];
  let event = args['event'];
  let focus = args['focus'];
  let receiver = args['receiver'];
  let response_id = args['response_id'];
  let responsible = args['responsible'];
  let sender = args['sender'];
  let source = args['source'];
  let source_uri = args['source_uri'];
  let target = args['target'];
  let timestamp = args['timestamp'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (destination) {
    query.destination = stringQueryBuilder(destination);
  }

  if (destination_uri) {
    query.destination_uri = stringQueryBuilder(destination_uri);
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (event) {
    query.event = stringQueryBuilder(event);
  }

  if (focus) {
    query.focus = stringQueryBuilder(focus);
  }

  if (receiver) {
    query.receiver = stringQueryBuilder(receiver);
  }

  if (response_id) {
    query.response_id = stringQueryBuilder(response_id);
  }

  if (responsible) {
    query.responsible = stringQueryBuilder(responsible);
  }

  if (sender) {
    query.sender = stringQueryBuilder(sender);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (source_uri) {
    query.source_uri = stringQueryBuilder(source_uri);
  }

  if (target) {
    query.target = stringQueryBuilder(target);
  }

  if (timestamp) {
    query.timestamp = stringQueryBuilder(timestamp);
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

  // Messageheader search params for DSTU2
  let author = args['author'];
  let code = args['code'];
  let destination = args['destination'];
  let destination_uri = args['destination_uri'];
  let enterer = args['enterer'];
  let event = args['event'];
  let focus = args['focus'];
  let receiver = args['receiver'];
  let response_id = args['response_id'];
  let responsible = args['responsible'];
  let sender = args['sender'];
  let source = args['source'];
  let source_uri = args['source_uri'];
  let target = args['target'];
  let timestamp = args['timestamp'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (destination) {
    query.destination = stringQueryBuilder(destination);
  }

  if (destination_uri) {
    query.destination_uri = stringQueryBuilder(destination_uri);
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (event) {
    query.event = stringQueryBuilder(event);
  }

  if (focus) {
    query.focus = stringQueryBuilder(focus);
  }

  if (receiver) {
    query.receiver = stringQueryBuilder(receiver);
  }

  if (response_id) {
    query.response_id = stringQueryBuilder(response_id);
  }

  if (responsible) {
    query.responsible = stringQueryBuilder(responsible);
  }

  if (sender) {
    query.sender = stringQueryBuilder(sender);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
  }

  if (source_uri) {
    query.source_uri = stringQueryBuilder(source_uri);
  }

  if (target) {
    query.target = stringQueryBuilder(target);
  }

  if (timestamp) {
    query.timestamp = stringQueryBuilder(timestamp);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Messageheader >>> search');

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
  let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${base_version}`);
  let Messageheader = getMessageheader(base_version);

  try {
    // Query our collection for this messageheader
    const cursor = collection.find(query);
    const messageheaders = await cursor.toArray();

    messageheaders.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Messageheader(element);
    });

    return toSearchBundle(messageheaders);
  } catch (err) {
    logger.error('Error with Messageheader.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Messageheader >>> searchById');

  let { base_version, id } = args;
  let Messageheader = getMessageheader(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${base_version}`);

  try {
    // Query our collection for this messageheader
    const messageheader = await collection.findOne({ id: id.toString() });

    if (messageheader) {
      delete messageheader._id;
      return new Messageheader(messageheader);
    }
    return null;
  } catch (err) {
    logger.error('Error with Messageheader.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Messageheader >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${base_version}`);

    // Get current record
    let Messageheader = getMessageheader(base_version);
    let messageheader = new Messageheader(resource);
    delete messageheader._id;

    // If no resource ID was provided, generate one.
    let id = messageheader.id || getUuid();
    if (!messageheader.id) {
      messageheader.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    messageheader.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(messageheader));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Messageheader created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Messageheader >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${base_version}`);

    // Get current record
    let Messageheader = getMessageheader(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Messageheader Class
    let messageheader = new Messageheader(resource);
    delete messageheader._id;
    messageheader.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(messageheader));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Messageheader updated with id: ' + id);
      resolve({
        id: messageheader.id,
        created: false,
        resource_version: messageheader.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Messageheader >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Messageheader deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Messageheader >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Messageheader = getMessageheader(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${base_version}`);

    // Query our collection for this messageheader with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((messageheader) => {
      if (messageheader) {
        delete messageheader._id;
        resolve(new Messageheader(messageheader));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Messageheader >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let code = args['code'];
    let destination = args['destination'];
    let destination_uri = args['destination_uri'];
    let enterer = args['enterer'];
    let event = args['event'];
    let focus = args['focus'];
    let receiver = args['receiver'];
    let response_id = args['response_id'];
    let responsible = args['responsible'];
    let sender = args['sender'];
    let source = args['source'];
    let source_uri = args['source_uri'];
    let target = args['target'];
    let timestamp = args['timestamp'];

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
    let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${base_version}`);
    let Messageheader = getMessageheader(base_version);

    // Query our collection for messageheader history
    collection.find(query).toArray().then((messageheaders) => {
      messageheaders.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Messageheader(element);
      });
      resolve(messageheaders);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Messageheader >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let code = args['code'];
    let destination = args['destination'];
    let destination_uri = args['destination_uri'];
    let enterer = args['enterer'];
    let event = args['event'];
    let focus = args['focus'];
    let receiver = args['receiver'];
    let response_id = args['response_id'];
    let responsible = args['responsible'];
    let sender = args['sender'];
    let source = args['source'];
    let source_uri = args['source_uri'];
    let target = args['target'];
    let timestamp = args['timestamp'];

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
    let collection = db.collection(`${COLLECTION.MESSAGEHEADER}_${base_version}`);
    let Messageheader = getMessageheader(base_version);

    // Query our collection for messageheader history by id
    collection.find(query).toArray().then((messageheaders) => {
      messageheaders.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Messageheader(element);
      });
      resolve(messageheaders);
    }).catch(_reject);
  });
