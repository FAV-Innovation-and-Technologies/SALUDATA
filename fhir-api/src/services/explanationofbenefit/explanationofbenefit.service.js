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

let getExplanationofbenefit = (base_version) => {
  return resolveSchema(base_version, 'Explanationofbenefit');
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

  // Explanationofbenefit search params
  let care_team = args['care_team'];
  let claim = args['claim'];
  let coverage = args['coverage'];
  let created = args['created'];
  let disposition = args['disposition'];
  let encounter = args['encounter'];
  let enterer = args['enterer'];
  let facility = args['facility'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let payee = args['payee'];
  let provider = args['provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (care_team) {
    query.care_team = stringQueryBuilder(care_team);
  }

  if (claim) {
    query.claim = stringQueryBuilder(claim);
  }

  if (coverage) {
    query.coverage = stringQueryBuilder(coverage);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (disposition) {
    query.disposition = stringQueryBuilder(disposition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (facility) {
    query.facility = stringQueryBuilder(facility);
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

  if (payee) {
    query.payee = stringQueryBuilder(payee);
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
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

  // Explanationofbenefit search params for DSTU2
  let care_team = args['care_team'];
  let claim = args['claim'];
  let coverage = args['coverage'];
  let created = args['created'];
  let disposition = args['disposition'];
  let encounter = args['encounter'];
  let enterer = args['enterer'];
  let facility = args['facility'];
  let identifier = args['identifier'];
  let organization = args['organization'];
  let patient = args['patient'];
  let payee = args['payee'];
  let provider = args['provider'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (care_team) {
    query.care_team = stringQueryBuilder(care_team);
  }

  if (claim) {
    query.claim = stringQueryBuilder(claim);
  }

  if (coverage) {
    query.coverage = stringQueryBuilder(coverage);
  }

  if (created) {
    query.created = stringQueryBuilder(created);
  }

  if (disposition) {
    query.disposition = stringQueryBuilder(disposition);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (enterer) {
    query.enterer = stringQueryBuilder(enterer);
  }

  if (facility) {
    query.facility = stringQueryBuilder(facility);
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

  if (payee) {
    query.payee = stringQueryBuilder(payee);
  }

  if (provider) {
    query.provider = stringQueryBuilder(provider);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Explanationofbenefit >>> search');

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
  let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${base_version}`);
  let Explanationofbenefit = getExplanationofbenefit(base_version);

  try {
    // Query our collection for this explanationofbenefit
    const cursor = collection.find(query);
    const explanationofbenefits = await cursor.toArray();

    explanationofbenefits.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Explanationofbenefit(element);
    });

    return toSearchBundle(explanationofbenefits);
  } catch (err) {
    logger.error('Error with Explanationofbenefit.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Explanationofbenefit >>> searchById');

  let { base_version, id } = args;
  let Explanationofbenefit = getExplanationofbenefit(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${base_version}`);

  try {
    // Query our collection for this explanationofbenefit
    const explanationofbenefit = await collection.findOne({ id: id.toString() });

    if (explanationofbenefit) {
      delete explanationofbenefit._id;
      return new Explanationofbenefit(explanationofbenefit);
    }
    return null;
  } catch (err) {
    logger.error('Error with Explanationofbenefit.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Explanationofbenefit >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${base_version}`);

    // Get current record
    let Explanationofbenefit = getExplanationofbenefit(base_version);
    let explanationofbenefit = new Explanationofbenefit(resource);
    delete explanationofbenefit._id;

    // If no resource ID was provided, generate one.
    let id = explanationofbenefit.id || getUuid();
    if (!explanationofbenefit.id) {
      explanationofbenefit.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    explanationofbenefit.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(explanationofbenefit));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Explanationofbenefit created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Explanationofbenefit >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${base_version}`);

    // Get current record
    let Explanationofbenefit = getExplanationofbenefit(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Explanationofbenefit Class
    let explanationofbenefit = new Explanationofbenefit(resource);
    delete explanationofbenefit._id;
    explanationofbenefit.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(explanationofbenefit));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Explanationofbenefit updated with id: ' + id);
      resolve({
        id: explanationofbenefit.id,
        created: false,
        resource_version: explanationofbenefit.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Explanationofbenefit >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Explanationofbenefit deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Explanationofbenefit >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Explanationofbenefit = getExplanationofbenefit(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${base_version}`);

    // Query our collection for this explanationofbenefit with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((explanationofbenefit) => {
      if (explanationofbenefit) {
        delete explanationofbenefit._id;
        resolve(new Explanationofbenefit(explanationofbenefit));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Explanationofbenefit >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let care_team = args['care_team'];
    let claim = args['claim'];
    let coverage = args['coverage'];
    let created = args['created'];
    let disposition = args['disposition'];
    let encounter = args['encounter'];
    let enterer = args['enterer'];
    let facility = args['facility'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let patient = args['patient'];
    let payee = args['payee'];
    let provider = args['provider'];

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
    let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${base_version}`);
    let Explanationofbenefit = getExplanationofbenefit(base_version);

    // Query our collection for explanationofbenefit history
    collection.find(query).toArray().then((explanationofbenefits) => {
      explanationofbenefits.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Explanationofbenefit(element);
      });
      resolve(explanationofbenefits);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Explanationofbenefit >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let care_team = args['care_team'];
    let claim = args['claim'];
    let coverage = args['coverage'];
    let created = args['created'];
    let disposition = args['disposition'];
    let encounter = args['encounter'];
    let enterer = args['enterer'];
    let facility = args['facility'];
    let identifier = args['identifier'];
    let organization = args['organization'];
    let patient = args['patient'];
    let payee = args['payee'];
    let provider = args['provider'];

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
    let collection = db.collection(`${COLLECTION.EXPLANATIONOFBENEFIT}_${base_version}`);
    let Explanationofbenefit = getExplanationofbenefit(base_version);

    // Query our collection for explanationofbenefit history by id
    collection.find(query).toArray().then((explanationofbenefits) => {
      explanationofbenefits.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Explanationofbenefit(element);
      });
      resolve(explanationofbenefits);
    }).catch(_reject);
  });
