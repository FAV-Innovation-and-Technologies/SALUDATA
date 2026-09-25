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

let getPractitioner = (base_version) => {
  return resolveSchema(base_version, 'Practitioner');
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

  // Practitioner search params
  let active = args['active'];
  let address = args['address'];
  let address_city = args['address_city'];
  let address_country = args['address_country'];
  let address_postalcode = args['address_postalcode'];
  let address_state = args['address_state'];
  let address_use = args['address_use'];
  let communication = args['communication'];
  let email = args['email'];
  let family = args['family'];
  let gender = args['gender'];
  let given = args['given'];
  let identifier = args['identifier'];
  let name = args['name'];
  let phone = args['phone'];
  let phonetic = args['phonetic'];
  let telecom = args['telecom'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (active) {
    query.active = stringQueryBuilder(active);
  }

  if (address) {
    query.address = stringQueryBuilder(address);
  }

  if (address_city) {
    query.address_city = stringQueryBuilder(address_city);
  }

  if (address_country) {
    query.address_country = stringQueryBuilder(address_country);
  }

  if (address_postalcode) {
    query.address_postalcode = stringQueryBuilder(address_postalcode);
  }

  if (address_state) {
    query.address_state = stringQueryBuilder(address_state);
  }

  if (address_use) {
    query.address_use = stringQueryBuilder(address_use);
  }

  if (communication) {
    query.communication = stringQueryBuilder(communication);
  }

  if (email) {
    query.email = stringQueryBuilder(email);
  }

  if (family) {
    query.family = stringQueryBuilder(family);
  }

  if (gender) {
    query.gender = stringQueryBuilder(gender);
  }

  if (given) {
    query.given = stringQueryBuilder(given);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (phone) {
    query.phone = stringQueryBuilder(phone);
  }

  if (phonetic) {
    query.phonetic = stringQueryBuilder(phonetic);
  }

  if (telecom) {
    query.telecom = stringQueryBuilder(telecom);
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

  // Practitioner search params for DSTU2
  let active = args['active'];
  let address = args['address'];
  let address_city = args['address_city'];
  let address_country = args['address_country'];
  let address_postalcode = args['address_postalcode'];
  let address_state = args['address_state'];
  let address_use = args['address_use'];
  let communication = args['communication'];
  let email = args['email'];
  let family = args['family'];
  let gender = args['gender'];
  let given = args['given'];
  let identifier = args['identifier'];
  let name = args['name'];
  let phone = args['phone'];
  let phonetic = args['phonetic'];
  let telecom = args['telecom'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (active) {
    query.active = stringQueryBuilder(active);
  }

  if (address) {
    query.address = stringQueryBuilder(address);
  }

  if (address_city) {
    query.address_city = stringQueryBuilder(address_city);
  }

  if (address_country) {
    query.address_country = stringQueryBuilder(address_country);
  }

  if (address_postalcode) {
    query.address_postalcode = stringQueryBuilder(address_postalcode);
  }

  if (address_state) {
    query.address_state = stringQueryBuilder(address_state);
  }

  if (address_use) {
    query.address_use = stringQueryBuilder(address_use);
  }

  if (communication) {
    query.communication = stringQueryBuilder(communication);
  }

  if (email) {
    query.email = stringQueryBuilder(email);
  }

  if (family) {
    query.family = stringQueryBuilder(family);
  }

  if (gender) {
    query.gender = stringQueryBuilder(gender);
  }

  if (given) {
    query.given = stringQueryBuilder(given);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (phone) {
    query.phone = stringQueryBuilder(phone);
  }

  if (phonetic) {
    query.phonetic = stringQueryBuilder(phonetic);
  }

  if (telecom) {
    query.telecom = stringQueryBuilder(telecom);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Practitioner >>> search');

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
  let collection = db.collection(`${COLLECTION.PRACTITIONER}_${base_version}`);
  let Practitioner = getPractitioner(base_version);

  try {
    // Query our collection for this practitioner
    const cursor = collection.find(query);
    const practitioners = await cursor.toArray();

    practitioners.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Practitioner(element);
    });

    return toSearchBundle(practitioners);
  } catch (err) {
    logger.error('Error with Practitioner.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Practitioner >>> searchById');

  let { base_version, id } = args;
  let Practitioner = getPractitioner(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PRACTITIONER}_${base_version}`);

  try {
    // Query our collection for this practitioner
    const practitioner = await collection.findOne({ id: id.toString() });

    if (practitioner) {
      delete practitioner._id;
      return new Practitioner(practitioner);
    }
    return null;
  } catch (err) {
    logger.error('Error with Practitioner.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitioner >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONER}_${base_version}`);

    // Get current record
    let Practitioner = getPractitioner(base_version);
    let practitioner = new Practitioner(resource);
    delete practitioner._id;

    // If no resource ID was provided, generate one.
    let id = practitioner.id || getUuid();
    if (!practitioner.id) {
      practitioner.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    practitioner.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(practitioner));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Practitioner created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitioner >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONER}_${base_version}`);

    // Get current record
    let Practitioner = getPractitioner(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Practitioner Class
    let practitioner = new Practitioner(resource);
    delete practitioner._id;
    practitioner.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(practitioner));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Practitioner updated with id: ' + id);
      resolve({
        id: practitioner.id,
        created: false,
        resource_version: practitioner.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitioner >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONER}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Practitioner deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitioner >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Practitioner = getPractitioner(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONER}_${base_version}`);

    // Query our collection for this practitioner with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((practitioner) => {
      if (practitioner) {
        delete practitioner._id;
        resolve(new Practitioner(practitioner));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitioner >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let active = args['active'];
    let address = args['address'];
    let address_city = args['address_city'];
    let address_country = args['address_country'];
    let address_postalcode = args['address_postalcode'];
    let address_state = args['address_state'];
    let address_use = args['address_use'];
    let communication = args['communication'];
    let email = args['email'];
    let family = args['family'];
    let gender = args['gender'];
    let given = args['given'];
    let identifier = args['identifier'];
    let name = args['name'];
    let phone = args['phone'];
    let phonetic = args['phonetic'];
    let telecom = args['telecom'];

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
    let collection = db.collection(`${COLLECTION.PRACTITIONER}_${base_version}`);
    let Practitioner = getPractitioner(base_version);

    // Query our collection for practitioner history
    collection.find(query).toArray().then((practitioners) => {
      practitioners.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Practitioner(element);
      });
      resolve(practitioners);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitioner >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let active = args['active'];
    let address = args['address'];
    let address_city = args['address_city'];
    let address_country = args['address_country'];
    let address_postalcode = args['address_postalcode'];
    let address_state = args['address_state'];
    let address_use = args['address_use'];
    let communication = args['communication'];
    let email = args['email'];
    let family = args['family'];
    let gender = args['gender'];
    let given = args['given'];
    let identifier = args['identifier'];
    let name = args['name'];
    let phone = args['phone'];
    let phonetic = args['phonetic'];
    let telecom = args['telecom'];

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
    let collection = db.collection(`${COLLECTION.PRACTITIONER}_${base_version}`);
    let Practitioner = getPractitioner(base_version);

    // Query our collection for practitioner history by id
    collection.find(query).toArray().then((practitioners) => {
      practitioners.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Practitioner(element);
      });
      resolve(practitioners);
    }).catch(_reject);
  });
