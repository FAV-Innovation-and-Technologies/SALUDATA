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

let getChargeitem = (base_version) => {
  return resolveSchema(base_version, 'Chargeitem');
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

  // Chargeitem search params
  let account = args['account'];
  let code = args['code'];
  let entered_date = args['entered_date'];
  let enterer = args['enterer'];
  let factor_override = args['factor_override'];
  let identifier = args['identifier'];
  let occurrence = args['occurrence'];
  let participant_actor = args['participant_actor'];
  let participant_role = args['participant_role'];
  let patient = args['patient'];
  let performing_organization = args['performing_organization'];
  let price_override = args['price_override'];
  let quantity = args['quantity'];
  let requesting_organization = args['requesting_organization'];
  let service = args['service'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (account) {
    query.account = stringQueryBuilder(account);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (entered_date) {
    let queryBuilder = dateQueryBuilder(entered_date, 'date', 'entered_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (factor_override) {
    query.factor_override = stringQueryBuilder(factor_override);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (occurrence) {
    query.occurrence = stringQueryBuilder(occurrence);
  }

  if (participant_actor) {
    query.participant_actor = stringQueryBuilder(participant_actor);
  }

  if (participant_role) {
    query.participant_role = stringQueryBuilder(participant_role);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performing_organization) {
    let queryBuilder = referenceQueryBuilder(performing_organization, 'performing_organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (price_override) {
    query.price_override = stringQueryBuilder(price_override);
  }

  if (quantity) {
    query.quantity = stringQueryBuilder(quantity);
  }

  if (requesting_organization) {
    let queryBuilder = referenceQueryBuilder(requesting_organization, 'requesting_organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (service) {
    query.service = stringQueryBuilder(service);
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

  // Chargeitem search params for DSTU2
  let account = args['account'];
  let code = args['code'];
  let entered_date = args['entered_date'];
  let enterer = args['enterer'];
  let factor_override = args['factor_override'];
  let identifier = args['identifier'];
  let occurrence = args['occurrence'];
  let participant_actor = args['participant_actor'];
  let participant_role = args['participant_role'];
  let patient = args['patient'];
  let performing_organization = args['performing_organization'];
  let price_override = args['price_override'];
  let quantity = args['quantity'];
  let requesting_organization = args['requesting_organization'];
  let service = args['service'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (account) {
    query.account = stringQueryBuilder(account);
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (entered_date) {
    let queryBuilder = dateQueryBuilder(entered_date, 'date', 'entered_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (factor_override) {
    query.factor_override = stringQueryBuilder(factor_override);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (occurrence) {
    query.occurrence = stringQueryBuilder(occurrence);
  }

  if (participant_actor) {
    query.participant_actor = stringQueryBuilder(participant_actor);
  }

  if (participant_role) {
    query.participant_role = stringQueryBuilder(participant_role);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performing_organization) {
    let queryBuilder = referenceQueryBuilder(performing_organization, 'performing_organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (price_override) {
    query.price_override = stringQueryBuilder(price_override);
  }

  if (quantity) {
    query.quantity = stringQueryBuilder(quantity);
  }

  if (requesting_organization) {
    let queryBuilder = referenceQueryBuilder(requesting_organization, 'requesting_organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (service) {
    query.service = stringQueryBuilder(service);
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
  logger.info('Chargeitem >>> search');

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
  let collection = db.collection(`${COLLECTION.CHARGEITEM}_${base_version}`);
  let Chargeitem = getChargeitem(base_version);

  try {
    // Query our collection for this chargeitem
    const cursor = collection.find(query);
    const chargeitems = await cursor.toArray();

    chargeitems.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Chargeitem(element);
    });

    return toSearchBundle(chargeitems);
  } catch (err) {
    logger.error('Error with Chargeitem.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Chargeitem >>> searchById');

  let { base_version, id } = args;
  let Chargeitem = getChargeitem(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CHARGEITEM}_${base_version}`);

  try {
    // Query our collection for this chargeitem
    const chargeitem = await collection.findOne({ id: id.toString() });

    if (chargeitem) {
      delete chargeitem._id;
      return new Chargeitem(chargeitem);
    }
    return null;
  } catch (err) {
    logger.error('Error with Chargeitem.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Chargeitem >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CHARGEITEM}_${base_version}`);

    // Get current record
    let Chargeitem = getChargeitem(base_version);
    let chargeitem = new Chargeitem(resource);
    delete chargeitem._id;

    // If no resource ID was provided, generate one.
    let id = chargeitem.id || getUuid();
    if (!chargeitem.id) {
      chargeitem.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    chargeitem.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(chargeitem));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Chargeitem created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Chargeitem >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CHARGEITEM}_${base_version}`);

    // Get current record
    let Chargeitem = getChargeitem(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Chargeitem Class
    let chargeitem = new Chargeitem(resource);
    delete chargeitem._id;
    chargeitem.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(chargeitem));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Chargeitem updated with id: ' + id);
      resolve({
        id: chargeitem.id,
        created: false,
        resource_version: chargeitem.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Chargeitem >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CHARGEITEM}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Chargeitem deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Chargeitem >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Chargeitem = getChargeitem(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CHARGEITEM}_${base_version}`);

    // Query our collection for this chargeitem with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((chargeitem) => {
      if (chargeitem) {
        delete chargeitem._id;
        resolve(new Chargeitem(chargeitem));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Chargeitem >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let account = args['account'];
    let code = args['code'];
    let entered_date = args['entered_date'];
    let enterer = args['enterer'];
    let factor_override = args['factor_override'];
    let identifier = args['identifier'];
    let occurrence = args['occurrence'];
    let participant_actor = args['participant_actor'];
    let participant_role = args['participant_role'];
    let patient = args['patient'];
    let performing_organization = args['performing_organization'];
    let price_override = args['price_override'];
    let quantity = args['quantity'];
    let requesting_organization = args['requesting_organization'];
    let service = args['service'];
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
    let collection = db.collection(`${COLLECTION.CHARGEITEM}_${base_version}`);
    let Chargeitem = getChargeitem(base_version);

    // Query our collection for chargeitem history
    collection.find(query).toArray().then((chargeitems) => {
      chargeitems.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Chargeitem(element);
      });
      resolve(chargeitems);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Chargeitem >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let account = args['account'];
    let code = args['code'];
    let entered_date = args['entered_date'];
    let enterer = args['enterer'];
    let factor_override = args['factor_override'];
    let identifier = args['identifier'];
    let occurrence = args['occurrence'];
    let participant_actor = args['participant_actor'];
    let participant_role = args['participant_role'];
    let patient = args['patient'];
    let performing_organization = args['performing_organization'];
    let price_override = args['price_override'];
    let quantity = args['quantity'];
    let requesting_organization = args['requesting_organization'];
    let service = args['service'];
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
    let collection = db.collection(`${COLLECTION.CHARGEITEM}_${base_version}`);
    let Chargeitem = getChargeitem(base_version);

    // Query our collection for chargeitem history by id
    collection.find(query).toArray().then((chargeitems) => {
      chargeitems.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Chargeitem(element);
      });
      resolve(chargeitems);
    }).catch(_reject);
  });
