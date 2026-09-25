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

let getQuestionnaireresponse = (base_version) => {
  return resolveSchema(base_version, 'Questionnaireresponse');
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

  // Questionnaireresponse search params
  let author = args['author'];
  let authored = args['authored'];
  let based_on = args['based_on'];
  let identifier = args['identifier'];
  let parent = args['parent'];
  let patient = args['patient'];
  let questionnaire = args['questionnaire'];
  let source = args['source'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (authored) {
    query.authored = stringQueryBuilder(authored);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
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

  if (questionnaire) {
    query.questionnaire = stringQueryBuilder(questionnaire);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
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

  // Questionnaireresponse search params for DSTU2
  let author = args['author'];
  let authored = args['authored'];
  let based_on = args['based_on'];
  let identifier = args['identifier'];
  let parent = args['parent'];
  let patient = args['patient'];
  let questionnaire = args['questionnaire'];
  let source = args['source'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (authored) {
    query.authored = stringQueryBuilder(authored);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
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

  if (questionnaire) {
    query.questionnaire = stringQueryBuilder(questionnaire);
  }

  if (source) {
    query.source = stringQueryBuilder(source);
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
  logger.info('Questionnaireresponse >>> search');

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
  let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);
  let Questionnaireresponse = getQuestionnaireresponse(base_version);

  try {
    // Query our collection for this questionnaireresponse
    const cursor = collection.find(query);
    const questionnaireresponses = await cursor.toArray();

    questionnaireresponses.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Questionnaireresponse(element);
    });

    return toSearchBundle(questionnaireresponses);
  } catch (err) {
    logger.error('Error with Questionnaireresponse.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Questionnaireresponse >>> searchById');

  let { base_version, id } = args;
  let Questionnaireresponse = getQuestionnaireresponse(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);

  try {
    // Query our collection for this questionnaireresponse
    const questionnaireresponse = await collection.findOne({ id: id.toString() });

    if (questionnaireresponse) {
      delete questionnaireresponse._id;
      return new Questionnaireresponse(questionnaireresponse);
    }
    return null;
  } catch (err) {
    logger.error('Error with Questionnaireresponse.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaireresponse >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);

    // Get current record
    let Questionnaireresponse = getQuestionnaireresponse(base_version);
    let questionnaireresponse = new Questionnaireresponse(resource);
    delete questionnaireresponse._id;

    // If no resource ID was provided, generate one.
    let id = questionnaireresponse.id || getUuid();
    if (!questionnaireresponse.id) {
      questionnaireresponse.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    questionnaireresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(questionnaireresponse));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Questionnaireresponse created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaireresponse >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);

    // Get current record
    let Questionnaireresponse = getQuestionnaireresponse(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Questionnaireresponse Class
    let questionnaireresponse = new Questionnaireresponse(resource);
    delete questionnaireresponse._id;
    questionnaireresponse.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(questionnaireresponse));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Questionnaireresponse updated with id: ' + id);
      resolve({
        id: questionnaireresponse.id,
        created: false,
        resource_version: questionnaireresponse.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaireresponse >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Questionnaireresponse deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaireresponse >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Questionnaireresponse = getQuestionnaireresponse(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);

    // Query our collection for this questionnaireresponse with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((questionnaireresponse) => {
      if (questionnaireresponse) {
        delete questionnaireresponse._id;
        resolve(new Questionnaireresponse(questionnaireresponse));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaireresponse >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let authored = args['authored'];
    let based_on = args['based_on'];
    let identifier = args['identifier'];
    let parent = args['parent'];
    let patient = args['patient'];
    let questionnaire = args['questionnaire'];
    let source = args['source'];
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
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);
    let Questionnaireresponse = getQuestionnaireresponse(base_version);

    // Query our collection for questionnaireresponse history
    collection.find(query).toArray().then((questionnaireresponses) => {
      questionnaireresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Questionnaireresponse(element);
      });
      resolve(questionnaireresponses);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaireresponse >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let author = args['author'];
    let authored = args['authored'];
    let based_on = args['based_on'];
    let identifier = args['identifier'];
    let parent = args['parent'];
    let patient = args['patient'];
    let questionnaire = args['questionnaire'];
    let source = args['source'];
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
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);
    let Questionnaireresponse = getQuestionnaireresponse(base_version);

    // Query our collection for questionnaireresponse history by id
    collection.find(query).toArray().then((questionnaireresponses) => {
      questionnaireresponses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Questionnaireresponse(element);
      });
      resolve(questionnaireresponses);
    }).catch(_reject);
  });
