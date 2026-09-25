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

let getComposition = (base_version) => {
  return resolveSchema(base_version, 'Composition');
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

  // Composition search params
  let attester = args['attester'];
  let author = args['author'];
  let confidentiality = args['confidentiality'];
  let date = args['date'];
  let encounter = args['encounter'];
  let entry = args['entry'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let period = args['period'];
  let related_id = args['related_id'];
  let related_ref = args['related_ref'];
  let section = args['section'];
  let status = args['status'];
  let subject = args['subject'];
  let title = args['title'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (attester) {
    query.attester = stringQueryBuilder(attester);
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (confidentiality) {
    query.confidentiality = stringQueryBuilder(confidentiality);
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

  if (entry) {
    query.entry = stringQueryBuilder(entry);
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

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (related_id) {
    query.related_id = stringQueryBuilder(related_id);
  }

  if (related_ref) {
    query.related_ref = stringQueryBuilder(related_ref);
  }

  if (section) {
    query.section = stringQueryBuilder(section);
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

  if (title) {
    query.title = stringQueryBuilder(title);
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

  // Composition search params for DSTU2
  let attester = args['attester'];
  let author = args['author'];
  let confidentiality = args['confidentiality'];
  let date = args['date'];
  let encounter = args['encounter'];
  let entry = args['entry'];
  let identifier = args['identifier'];
  let patient = args['patient'];
  let period = args['period'];
  let related_id = args['related_id'];
  let related_ref = args['related_ref'];
  let section = args['section'];
  let status = args['status'];
  let subject = args['subject'];
  let title = args['title'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (attester) {
    query.attester = stringQueryBuilder(attester);
  }

  if (author) {
    query.author = stringQueryBuilder(author);
  }

  if (confidentiality) {
    query.confidentiality = stringQueryBuilder(confidentiality);
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

  if (entry) {
    query.entry = stringQueryBuilder(entry);
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

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (related_id) {
    query.related_id = stringQueryBuilder(related_id);
  }

  if (related_ref) {
    query.related_ref = stringQueryBuilder(related_ref);
  }

  if (section) {
    query.section = stringQueryBuilder(section);
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

  if (title) {
    query.title = stringQueryBuilder(title);
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
  logger.info('Composition >>> search');

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
  let collection = db.collection(`${COLLECTION.COMPOSITION}_${base_version}`);
  let Composition = getComposition(base_version);

  try {
    // Query our collection for this composition
    const cursor = collection.find(query);
    const compositions = await cursor.toArray();

    compositions.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Composition(element);
    });

    return toSearchBundle(compositions);
  } catch (err) {
    logger.error('Error with Composition.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Composition >>> searchById');

  let { base_version, id } = args;
  let Composition = getComposition(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.COMPOSITION}_${base_version}`);

  try {
    // Query our collection for this composition
    const composition = await collection.findOne({ id: id.toString() });

    if (composition) {
      delete composition._id;
      return new Composition(composition);
    }
    return null;
  } catch (err) {
    logger.error('Error with Composition.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Composition >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPOSITION}_${base_version}`);

    // Get current record
    let Composition = getComposition(base_version);
    let composition = new Composition(resource);
    delete composition._id;

    // If no resource ID was provided, generate one.
    let id = composition.id || getUuid();
    if (!composition.id) {
      composition.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    composition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(composition));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Composition created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Composition >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPOSITION}_${base_version}`);

    // Get current record
    let Composition = getComposition(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Composition Class
    let composition = new Composition(resource);
    delete composition._id;
    composition.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(composition));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Composition updated with id: ' + id);
      resolve({
        id: composition.id,
        created: false,
        resource_version: composition.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Composition >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPOSITION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Composition deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Composition >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Composition = getComposition(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.COMPOSITION}_${base_version}`);

    // Query our collection for this composition with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((composition) => {
      if (composition) {
        delete composition._id;
        resolve(new Composition(composition));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Composition >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let attester = args['attester'];
    let author = args['author'];
    let confidentiality = args['confidentiality'];
    let date = args['date'];
    let encounter = args['encounter'];
    let entry = args['entry'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let period = args['period'];
    let related_id = args['related_id'];
    let related_ref = args['related_ref'];
    let section = args['section'];
    let status = args['status'];
    let subject = args['subject'];
    let title = args['title'];
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
    let collection = db.collection(`${COLLECTION.COMPOSITION}_${base_version}`);
    let Composition = getComposition(base_version);

    // Query our collection for composition history
    collection.find(query).toArray().then((compositions) => {
      compositions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Composition(element);
      });
      resolve(compositions);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Composition >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let attester = args['attester'];
    let author = args['author'];
    let confidentiality = args['confidentiality'];
    let date = args['date'];
    let encounter = args['encounter'];
    let entry = args['entry'];
    let identifier = args['identifier'];
    let patient = args['patient'];
    let period = args['period'];
    let related_id = args['related_id'];
    let related_ref = args['related_ref'];
    let section = args['section'];
    let status = args['status'];
    let subject = args['subject'];
    let title = args['title'];
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
    let collection = db.collection(`${COLLECTION.COMPOSITION}_${base_version}`);
    let Composition = getComposition(base_version);

    // Query our collection for composition history by id
    collection.find(query).toArray().then((compositions) => {
      compositions.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Composition(element);
      });
      resolve(compositions);
    }).catch(_reject);
  });
