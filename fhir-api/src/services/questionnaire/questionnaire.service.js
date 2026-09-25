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

let getQuestionnaire = (base_version) => {
  return resolveSchema(base_version, 'Questionnaire');
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

  // Questionnaire search params
  let code = args['code'];
  let date = args['date'];
  let description = args['description'];
  let effective = args['effective'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let status = args['status'];
  let title = args['title'];
  let url = args['url'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (effective) {
    query.effective = stringQueryBuilder(effective);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (version) {
    query.version = stringQueryBuilder(version);
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

  // Questionnaire search params for DSTU2
  let code = args['code'];
  let date = args['date'];
  let description = args['description'];
  let effective = args['effective'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let publisher = args['publisher'];
  let status = args['status'];
  let title = args['title'];
  let url = args['url'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (effective) {
    query.effective = stringQueryBuilder(effective);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (version) {
    query.version = stringQueryBuilder(version);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Questionnaire >>> search');

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
  let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${base_version}`);
  let Questionnaire = getQuestionnaire(base_version);

  try {
    // Query our collection for this questionnaire
    const cursor = collection.find(query);
    const questionnaires = await cursor.toArray();

    questionnaires.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Questionnaire(element);
    });

    return toSearchBundle(questionnaires);
  } catch (err) {
    logger.error('Error with Questionnaire.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Questionnaire >>> searchById');

  let { base_version, id } = args;
  let Questionnaire = getQuestionnaire(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${base_version}`);

  try {
    // Query our collection for this questionnaire
    const questionnaire = await collection.findOne({ id: id.toString() });

    if (questionnaire) {
      delete questionnaire._id;
      return new Questionnaire(questionnaire);
    }
    return null;
  } catch (err) {
    logger.error('Error with Questionnaire.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaire >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${base_version}`);

    // Get current record
    let Questionnaire = getQuestionnaire(base_version);
    let questionnaire = new Questionnaire(resource);
    delete questionnaire._id;

    // If no resource ID was provided, generate one.
    let id = questionnaire.id || getUuid();
    if (!questionnaire.id) {
      questionnaire.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    questionnaire.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(questionnaire));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Questionnaire created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaire >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${base_version}`);

    // Get current record
    let Questionnaire = getQuestionnaire(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Questionnaire Class
    let questionnaire = new Questionnaire(resource);
    delete questionnaire._id;
    questionnaire.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(questionnaire));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Questionnaire updated with id: ' + id);
      resolve({
        id: questionnaire.id,
        created: false,
        resource_version: questionnaire.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaire >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Questionnaire deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaire >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Questionnaire = getQuestionnaire(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${base_version}`);

    // Query our collection for this questionnaire with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((questionnaire) => {
      if (questionnaire) {
        delete questionnaire._id;
        resolve(new Questionnaire(questionnaire));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaire >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let date = args['date'];
    let description = args['description'];
    let effective = args['effective'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let status = args['status'];
    let title = args['title'];
    let url = args['url'];
    let version = args['version'];

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
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${base_version}`);
    let Questionnaire = getQuestionnaire(base_version);

    // Query our collection for questionnaire history
    collection.find(query).toArray().then((questionnaires) => {
      questionnaires.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Questionnaire(element);
      });
      resolve(questionnaires);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Questionnaire >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let date = args['date'];
    let description = args['description'];
    let effective = args['effective'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let publisher = args['publisher'];
    let status = args['status'];
    let title = args['title'];
    let url = args['url'];
    let version = args['version'];

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
    let collection = db.collection(`${COLLECTION.QUESTIONNAIRE}_${base_version}`);
    let Questionnaire = getQuestionnaire(base_version);

    // Query our collection for questionnaire history by id
    collection.find(query).toArray().then((questionnaires) => {
      questionnaires.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Questionnaire(element);
      });
      resolve(questionnaires);
    }).catch(_reject);
  });
