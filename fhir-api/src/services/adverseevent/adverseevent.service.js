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

let getAdverseevent = (base_version) => {
  return resolveSchema(base_version, 'Adverseevent');
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

  // Adverseevent search params
  let category = args['category'];
  let date = args['date'];
  let location = args['location'];
  let reaction = args['reaction'];
  let recorder = args['recorder'];
  let seriousness = args['seriousness'];
  let study = args['study'];
  let subject = args['subject'];
  let substance = args['substance'];
  let type = args['type'];

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

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (reaction) {
    query.reaction = stringQueryBuilder(reaction);
  }

  if (recorder) {
    query.recorder = stringQueryBuilder(recorder);
  }

  if (seriousness) {
    query.seriousness = stringQueryBuilder(seriousness);
  }

  if (study) {
    query.study = stringQueryBuilder(study);
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (substance) {
    query.substance = stringQueryBuilder(substance);
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

  // Adverseevent search params for DSTU2
  let category = args['category'];
  let date = args['date'];
  let location = args['location'];
  let reaction = args['reaction'];
  let recorder = args['recorder'];
  let seriousness = args['seriousness'];
  let study = args['study'];
  let subject = args['subject'];
  let substance = args['substance'];
  let type = args['type'];

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

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (reaction) {
    query.reaction = stringQueryBuilder(reaction);
  }

  if (recorder) {
    query.recorder = stringQueryBuilder(recorder);
  }

  if (seriousness) {
    query.seriousness = stringQueryBuilder(seriousness);
  }

  if (study) {
    query.study = stringQueryBuilder(study);
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (substance) {
    query.substance = stringQueryBuilder(substance);
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
  logger.info('Adverseevent >>> search');

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
  let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${base_version}`);
  let Adverseevent = getAdverseevent(base_version);

  try {
    // Query our collection for this adverseevent
    const cursor = collection.find(query);
    const adverseevents = await cursor.toArray();

    adverseevents.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Adverseevent(element);
    });

    return toSearchBundle(adverseevents);
  } catch (err) {
    logger.error('Error with Adverseevent.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Adverseevent >>> searchById');

  let { base_version, id } = args;
  let Adverseevent = getAdverseevent(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${base_version}`);

  try {
    // Query our collection for this adverseevent
    const adverseevent = await collection.findOne({ id: id.toString() });

    if (adverseevent) {
      delete adverseevent._id;
      return new Adverseevent(adverseevent);
    }
    return null;
  } catch (err) {
    logger.error('Error with Adverseevent.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Adverseevent >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${base_version}`);

    // Get current record
    let Adverseevent = getAdverseevent(base_version);
    let adverseevent = new Adverseevent(resource);
    delete adverseevent._id;

    // If no resource ID was provided, generate one.
    let id = adverseevent.id || getUuid();
    if (!adverseevent.id) {
      adverseevent.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    adverseevent.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(adverseevent));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Adverseevent created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Adverseevent >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${base_version}`);

    // Get current record
    let Adverseevent = getAdverseevent(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Adverseevent Class
    let adverseevent = new Adverseevent(resource);
    delete adverseevent._id;
    adverseevent.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(adverseevent));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Adverseevent updated with id: ' + id);
      resolve({
        id: adverseevent.id,
        created: false,
        resource_version: adverseevent.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Adverseevent >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Adverseevent deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Adverseevent >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Adverseevent = getAdverseevent(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${base_version}`);

    // Query our collection for this adverseevent with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((adverseevent) => {
      if (adverseevent) {
        delete adverseevent._id;
        resolve(new Adverseevent(adverseevent));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Adverseevent >>> history');

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
    let location = args['location'];
    let reaction = args['reaction'];
    let recorder = args['recorder'];
    let seriousness = args['seriousness'];
    let study = args['study'];
    let subject = args['subject'];
    let substance = args['substance'];
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
    let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${base_version}`);
    let Adverseevent = getAdverseevent(base_version);

    // Query our collection for adverseevent history
    collection.find(query).toArray().then((adverseevents) => {
      adverseevents.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Adverseevent(element);
      });
      resolve(adverseevents);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Adverseevent >>> historyById');

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
    let location = args['location'];
    let reaction = args['reaction'];
    let recorder = args['recorder'];
    let seriousness = args['seriousness'];
    let study = args['study'];
    let subject = args['subject'];
    let substance = args['substance'];
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
    let collection = db.collection(`${COLLECTION.ADVERSEEVENT}_${base_version}`);
    let Adverseevent = getAdverseevent(base_version);

    // Query our collection for adverseevent history by id
    collection.find(query).toArray().then((adverseevents) => {
      adverseevents.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Adverseevent(element);
      });
      resolve(adverseevents);
    }).catch(_reject);
  });
