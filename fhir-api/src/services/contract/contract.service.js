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

let getContract = (base_version) => {
  return resolveSchema(base_version, 'Contract');
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

  // Contract search params
  let agent = args['agent'];
  let authority = args['authority'];
  let domain = args['domain'];
  let identifier = args['identifier'];
  let issued = args['issued'];
  let patient = args['patient'];
  let signer = args['signer'];
  let subject = args['subject'];
  let term_topic = args['term_topic'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (agent) {
    query.agent = stringQueryBuilder(agent);
  }

  if (authority) {
    query.authority = stringQueryBuilder(authority);
  }

  if (domain) {
    query.domain = stringQueryBuilder(domain);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (issued) {
    query.issued = stringQueryBuilder(issued);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (signer) {
    query.signer = stringQueryBuilder(signer);
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (term_topic) {
    query.term_topic = stringQueryBuilder(term_topic);
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

  // Contract search params for DSTU2
  let agent = args['agent'];
  let authority = args['authority'];
  let domain = args['domain'];
  let identifier = args['identifier'];
  let issued = args['issued'];
  let patient = args['patient'];
  let signer = args['signer'];
  let subject = args['subject'];
  let term_topic = args['term_topic'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (agent) {
    query.agent = stringQueryBuilder(agent);
  }

  if (authority) {
    query.authority = stringQueryBuilder(authority);
  }

  if (domain) {
    query.domain = stringQueryBuilder(domain);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (issued) {
    query.issued = stringQueryBuilder(issued);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (signer) {
    query.signer = stringQueryBuilder(signer);
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (term_topic) {
    query.term_topic = stringQueryBuilder(term_topic);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Contract >>> search');

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
  let collection = db.collection(`${COLLECTION.CONTRACT}_${base_version}`);
  let Contract = getContract(base_version);

  try {
    // Query our collection for this contract
    const cursor = collection.find(query);
    const contracts = await cursor.toArray();

    contracts.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Contract(element);
    });

    return toSearchBundle(contracts);
  } catch (err) {
    logger.error('Error with Contract.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Contract >>> searchById');

  let { base_version, id } = args;
  let Contract = getContract(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.CONTRACT}_${base_version}`);

  try {
    // Query our collection for this contract
    const contract = await collection.findOne({ id: id.toString() });

    if (contract) {
      delete contract._id;
      return new Contract(contract);
    }
    return null;
  } catch (err) {
    logger.error('Error with Contract.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Contract >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONTRACT}_${base_version}`);

    // Get current record
    let Contract = getContract(base_version);
    let contract = new Contract(resource);
    delete contract._id;

    // If no resource ID was provided, generate one.
    let id = contract.id || getUuid();
    if (!contract.id) {
      contract.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    contract.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(contract));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Contract created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Contract >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONTRACT}_${base_version}`);

    // Get current record
    let Contract = getContract(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Contract Class
    let contract = new Contract(resource);
    delete contract._id;
    contract.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(contract));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Contract updated with id: ' + id);
      resolve({
        id: contract.id,
        created: false,
        resource_version: contract.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Contract >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONTRACT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Contract deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Contract >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Contract = getContract(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.CONTRACT}_${base_version}`);

    // Query our collection for this contract with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((contract) => {
      if (contract) {
        delete contract._id;
        resolve(new Contract(contract));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Contract >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let agent = args['agent'];
    let authority = args['authority'];
    let domain = args['domain'];
    let identifier = args['identifier'];
    let issued = args['issued'];
    let patient = args['patient'];
    let signer = args['signer'];
    let subject = args['subject'];
    let term_topic = args['term_topic'];

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
    let collection = db.collection(`${COLLECTION.CONTRACT}_${base_version}`);
    let Contract = getContract(base_version);

    // Query our collection for contract history
    collection.find(query).toArray().then((contracts) => {
      contracts.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Contract(element);
      });
      resolve(contracts);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Contract >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let agent = args['agent'];
    let authority = args['authority'];
    let domain = args['domain'];
    let identifier = args['identifier'];
    let issued = args['issued'];
    let patient = args['patient'];
    let signer = args['signer'];
    let subject = args['subject'];
    let term_topic = args['term_topic'];

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
    let collection = db.collection(`${COLLECTION.CONTRACT}_${base_version}`);
    let Contract = getContract(base_version);

    // Query our collection for contract history by id
    collection.find(query).toArray().then((contracts) => {
      contracts.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Contract(element);
      });
      resolve(contracts);
    }).catch(_reject);
  });
