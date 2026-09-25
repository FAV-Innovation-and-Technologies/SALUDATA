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

let getMedicationdispense = (base_version) => {
  return resolveSchema(base_version, 'Medicationdispense');
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

  // Medicationdispense search params
  let code = args['code'];
  let destination = args['destination'];
  let identifier = args['identifier'];
  let medication = args['medication'];
  let patient = args['patient'];
  let performer = args['performer'];
  let prescription = args['prescription'];
  let receiver = args['receiver'];
  let responsibleparty = args['responsibleparty'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];
  let whenhandedover = args['whenhandedover'];
  let whenprepared = args['whenprepared'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (destination) {
    query.destination = stringQueryBuilder(destination);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (prescription) {
    query.prescription = stringQueryBuilder(prescription);
  }

  if (receiver) {
    query.receiver = stringQueryBuilder(receiver);
  }

  if (responsibleparty) {
    query.responsibleparty = stringQueryBuilder(responsibleparty);
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

  if (whenhandedover) {
    query.whenhandedover = stringQueryBuilder(whenhandedover);
  }

  if (whenprepared) {
    query.whenprepared = stringQueryBuilder(whenprepared);
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

  // Medicationdispense search params for DSTU2
  let code = args['code'];
  let destination = args['destination'];
  let identifier = args['identifier'];
  let medication = args['medication'];
  let patient = args['patient'];
  let performer = args['performer'];
  let prescription = args['prescription'];
  let receiver = args['receiver'];
  let responsibleparty = args['responsibleparty'];
  let status = args['status'];
  let subject = args['subject'];
  let type = args['type'];
  let whenhandedover = args['whenhandedover'];
  let whenprepared = args['whenprepared'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (destination) {
    query.destination = stringQueryBuilder(destination);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
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

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (prescription) {
    query.prescription = stringQueryBuilder(prescription);
  }

  if (receiver) {
    query.receiver = stringQueryBuilder(receiver);
  }

  if (responsibleparty) {
    query.responsibleparty = stringQueryBuilder(responsibleparty);
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

  if (whenhandedover) {
    query.whenhandedover = stringQueryBuilder(whenhandedover);
  }

  if (whenprepared) {
    query.whenprepared = stringQueryBuilder(whenprepared);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Medicationdispense >>> search');

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
  let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${base_version}`);
  let Medicationdispense = getMedicationdispense(base_version);

  try {
    // Query our collection for this medicationdispense
    const cursor = collection.find(query);
    const medicationdispenses = await cursor.toArray();

    medicationdispenses.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Medicationdispense(element);
    });

    return toSearchBundle(medicationdispenses);
  } catch (err) {
    logger.error('Error with Medicationdispense.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Medicationdispense >>> searchById');

  let { base_version, id } = args;
  let Medicationdispense = getMedicationdispense(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${base_version}`);

  try {
    // Query our collection for this medicationdispense
    const medicationdispense = await collection.findOne({ id: id.toString() });

    if (medicationdispense) {
      delete medicationdispense._id;
      return new Medicationdispense(medicationdispense);
    }
    return null;
  } catch (err) {
    logger.error('Error with Medicationdispense.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationdispense >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${base_version}`);

    // Get current record
    let Medicationdispense = getMedicationdispense(base_version);
    let medicationdispense = new Medicationdispense(resource);
    delete medicationdispense._id;

    // If no resource ID was provided, generate one.
    let id = medicationdispense.id || getUuid();
    if (!medicationdispense.id) {
      medicationdispense.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    medicationdispense.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medicationdispense));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Medicationdispense created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationdispense >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${base_version}`);

    // Get current record
    let Medicationdispense = getMedicationdispense(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Medicationdispense Class
    let medicationdispense = new Medicationdispense(resource);
    delete medicationdispense._id;
    medicationdispense.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(medicationdispense));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Medicationdispense updated with id: ' + id);
      resolve({
        id: medicationdispense.id,
        created: false,
        resource_version: medicationdispense.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationdispense >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Medicationdispense deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationdispense >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Medicationdispense = getMedicationdispense(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${base_version}`);

    // Query our collection for this medicationdispense with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((medicationdispense) => {
      if (medicationdispense) {
        delete medicationdispense._id;
        resolve(new Medicationdispense(medicationdispense));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationdispense >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let destination = args['destination'];
    let identifier = args['identifier'];
    let medication = args['medication'];
    let patient = args['patient'];
    let performer = args['performer'];
    let prescription = args['prescription'];
    let receiver = args['receiver'];
    let responsibleparty = args['responsibleparty'];
    let status = args['status'];
    let subject = args['subject'];
    let type = args['type'];
    let whenhandedover = args['whenhandedover'];
    let whenprepared = args['whenprepared'];

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
    let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${base_version}`);
    let Medicationdispense = getMedicationdispense(base_version);

    // Query our collection for medicationdispense history
    collection.find(query).toArray().then((medicationdispenses) => {
      medicationdispenses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medicationdispense(element);
      });
      resolve(medicationdispenses);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Medicationdispense >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let code = args['code'];
    let destination = args['destination'];
    let identifier = args['identifier'];
    let medication = args['medication'];
    let patient = args['patient'];
    let performer = args['performer'];
    let prescription = args['prescription'];
    let receiver = args['receiver'];
    let responsibleparty = args['responsibleparty'];
    let status = args['status'];
    let subject = args['subject'];
    let type = args['type'];
    let whenhandedover = args['whenhandedover'];
    let whenprepared = args['whenprepared'];

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
    let collection = db.collection(`${COLLECTION.MEDICATIONDISPENSE}_${base_version}`);
    let Medicationdispense = getMedicationdispense(base_version);

    // Query our collection for medicationdispense history by id
    collection.find(query).toArray().then((medicationdispenses) => {
      medicationdispenses.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Medicationdispense(element);
      });
      resolve(medicationdispenses);
    }).catch(_reject);
  });
