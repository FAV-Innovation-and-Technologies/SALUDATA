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

let getConsent = (base_version) => {
  return resolveSchema(base_version, 'Consent');
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

  // Consent search params
  let action = args['action'];
  let actor = args['actor'];
  let category = args['category'];
  let consentor = args['consentor'];
  let data = args['data'];
  let date = args['date'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let period = args['period'];
  let purpose = args['purpose'];
  let securitylabel = args['securitylabel'];
  let source = args['source'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
  }

  if (actor) {
    query.actor = stringQueryBuilder(actor);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (consentor) {
    query.consentor = stringQueryBuilder(consentor);
  }

  if (data) {
    query.data = stringQueryBuilder(data);
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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
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

  if (purpose) {
    query.purpose = stringQueryBuilder(purpose);
  }

  if (securitylabel) {
    query.securitylabel = stringQueryBuilder(securitylabel);
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

  // Consent search params for DSTU2
  let action = args['action'];
  let actor = args['actor'];
  let category = args['category'];
  let consentor = args['consentor'];
  let data = args['data'];
  let date = args['date'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let period = args['period'];
  let purpose = args['purpose'];
  let securitylabel = args['securitylabel'];
  let source = args['source'];
  let status = args['status'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (action) {
    query.action = stringQueryBuilder(action);
  }

  if (actor) {
    query.actor = stringQueryBuilder(actor);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (consentor) {
    query.consentor = stringQueryBuilder(consentor);
  }

  if (data) {
    query.data = stringQueryBuilder(data);
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

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
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

  if (purpose) {
    query.purpose = stringQueryBuilder(purpose);
  }

  if (securitylabel) {
    query.securitylabel = stringQueryBuilder(securitylabel);
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

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Consent >>> search');

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
  let collection = db.collection(`${COLLECTION.CONSENT}_${base_version}`);
  let Consent = getConsent(base_version);

  try {
    // Query our collection for this consent
    const cursor = collection.find(query);
    const consents = await cursor.toArray();

    consents.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Consent(element);
    });

    return toSearchBundle(consents);
  } catch (err) {
    logger.error('Error with Consent.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Consent >>> searchById');

  let { base_version, id } = args;
  let Consent = getConsent(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CONSENT}_${base_version}`);

  try {
    // Query our collection for this consent
    const consent = await collection.findOne({ id: id.toString() });

    if (consent) {
      delete consent._id;
      return new Consent(consent);
    }
    return null;
  } catch (err) {
    logger.error('Error with Consent.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Consent >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONSENT}_${base_version}`);

    // Get current record
    let Consent = getConsent(base_version);
    let consent = new Consent(resource);
    delete consent._id;

    // If no resource ID was provided, generate one.
    let id = consent.id || getUuid();
    if (!consent.id) {
      consent.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    consent.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(consent));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Consent created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Consent >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONSENT}_${base_version}`);

    // Get current record
    let Consent = getConsent(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Consent Class
    let consent = new Consent(resource);
    delete consent._id;
    consent.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(consent));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Consent updated with id: ' + id);
      resolve({
        id: consent.id,
        created: false,
        resource_version: consent.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Consent >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONSENT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Consent deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Consent >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Consent = getConsent(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONSENT}_${base_version}`);

    // Query our collection for this consent with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((consent) => {
      if (consent) {
        delete consent._id;
        resolve(new Consent(consent));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Consent >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let actor = args['actor'];
    let category = args['category'];
    let consentor = args['consentor'];
    let data = args['data'];
    let date = args['date'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let patient = args['patient'];
    let period = args['period'];
    let purpose = args['purpose'];
    let securitylabel = args['securitylabel'];
    let source = args['source'];
    let status = args['status'];

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
    let collection = db.collection(`${COLLECTION.CONSENT}_${base_version}`);
    let Consent = getConsent(base_version);

    // Query our collection for consent history
    collection.find(query).toArray().then((consents) => {
      consents.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Consent(element);
      });
      resolve(consents);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Consent >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let action = args['action'];
    let actor = args['actor'];
    let category = args['category'];
    let consentor = args['consentor'];
    let data = args['data'];
    let date = args['date'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let patient = args['patient'];
    let period = args['period'];
    let purpose = args['purpose'];
    let securitylabel = args['securitylabel'];
    let source = args['source'];
    let status = args['status'];

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
    let collection = db.collection(`${COLLECTION.CONSENT}_${base_version}`);
    let Consent = getConsent(base_version);

    // Query our collection for consent history by id
    collection.find(query).toArray().then((consents) => {
      consents.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Consent(element);
      });
      resolve(consents);
    }).catch(_reject);
  });
