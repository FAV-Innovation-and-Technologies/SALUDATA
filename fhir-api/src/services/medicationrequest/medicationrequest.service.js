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

let getMedicationrequest = (base_version) => {
  return resolveSchema(base_version, 'Medicationrequest');
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

  // Medicationrequest search params
  let authoredon = args['authoredon'];
  let category = args['category'];
  let code = args['code'];
  let date = args['date'];
  let identifier = args['identifier'];
  let intended_dispenser = args['intended_dispenser'];
  let intent = args['intent'];
  let medication = args['medication'];
  let patient = args['patient'];
  let priority = args['priority'];
  let requester = args['requester'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authoredon) {
    query.authoredon = stringQueryBuilder(authoredon);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (intended_dispenser) {
    query.intended_dispenser = stringQueryBuilder(intended_dispenser);
  }

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (medication) {
    query.medication = stringQueryBuilder(medication);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
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

  // Medicationrequest search params for DSTU2
  let authoredon = args['authoredon'];
  let category = args['category'];
  let code = args['code'];
  let date = args['date'];
  let identifier = args['identifier'];
  let intended_dispenser = args['intended_dispenser'];
  let intent = args['intent'];
  let medication = args['medication'];
  let patient = args['patient'];
  let priority = args['priority'];
  let requester = args['requester'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authoredon) {
    query.authoredon = stringQueryBuilder(authoredon);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (intended_dispenser) {
    query.intended_dispenser = stringQueryBuilder(intended_dispenser);
  }

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (medication) {
    query.medication = stringQueryBuilder(medication);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
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
  logger.info('Medicationrequest >>> search');

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
  let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);
  let Medicationrequest = getMedicationrequest(base_version);

  try {
    // Query our collection for this medicationrequest
    const cursor = collection.find(query);
    const medicationrequests = await cursor.toArray();

    medicationrequests.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Medicationrequest(element);
    });

    return toSearchBundle(medicationrequests);
  } catch (err) {
    logger.error('Error with Medicationrequest.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Medicationrequest >>> searchById');

  let { base_version, id } = args;
  let Medicationrequest = getMedicationrequest(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);

  try {
    // Query our collection for this medicationrequest
    const medicationrequest = await collection.findOne({ id: id.toString() });

    if (medicationrequest) {
      delete medicationrequest._id;
      return new Medicationrequest(medicationrequest);
    }
    return null;
  } catch (err) {
    logger.error('Error with Medicationrequest.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationrequest >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);

    // Get current record
    let Medicationrequest = getMedicationrequest(base_version);
    let medicationrequest = new Medicationrequest(resource);
    delete medicationrequest._id;

    // If no resource ID was provided, generate one.
    let id = medicationrequest.id || getUuid();
    if (!medicationrequest.id) {
      medicationrequest.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medicationrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medicationrequest));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Medicationrequest created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationrequest >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);

    // Get current record
    let Medicationrequest = getMedicationrequest(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Medicationrequest Class
    let medicationrequest = new Medicationrequest(resource);
    delete medicationrequest._id;
    medicationrequest.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medicationrequest));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Medicationrequest updated with id: ' + id);
      resolve({
        id: medicationrequest.id,
        created: false,
        resource_version: medicationrequest.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationrequest >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Medicationrequest deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationrequest >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Medicationrequest = getMedicationrequest(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);

    // Query our collection for this medicationrequest with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((medicationrequest) => {
      if (medicationrequest) {
        delete medicationrequest._id;
        resolve(new Medicationrequest(medicationrequest));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationrequest >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authoredon = args['authoredon'];
    let category = args['category'];
    let code = args['code'];
    let date = args['date'];
    let identifier = args['identifier'];
    let intended_dispenser = args['intended_dispenser'];
    let intent = args['intent'];
    let medication = args['medication'];
    let patient = args['patient'];
    let priority = args['priority'];
    let requester = args['requester'];
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
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);
    let Medicationrequest = getMedicationrequest(base_version);

    // Query our collection for medicationrequest history
    collection.find(query).toArray().then((medicationrequests) => {
      medicationrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medicationrequest(element);
      });
      resolve(medicationrequests);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationrequest >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authoredon = args['authoredon'];
    let category = args['category'];
    let code = args['code'];
    let date = args['date'];
    let identifier = args['identifier'];
    let intended_dispenser = args['intended_dispenser'];
    let intent = args['intent'];
    let medication = args['medication'];
    let patient = args['patient'];
    let priority = args['priority'];
    let requester = args['requester'];
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
    let collection = db.collection(`${COLLECTION.MEDICATIONREQUEST}_${base_version}`);
    let Medicationrequest = getMedicationrequest(base_version);

    // Query our collection for medicationrequest history by id
    collection.find(query).toArray().then((medicationrequests) => {
      medicationrequests.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medicationrequest(element);
      });
      resolve(medicationrequests);
    }).catch(_reject);
  });
