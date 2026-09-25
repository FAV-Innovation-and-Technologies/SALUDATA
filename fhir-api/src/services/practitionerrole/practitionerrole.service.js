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

let getPractitionerrole = (base_version) => {
  return resolveSchema(base_version, 'Practitionerrole');
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

  // Practitionerrole search params
  let active = args['active'];
  let date = args['date'];
  let email = args['email'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let location = args['location'];
  let organization = args['organization'];
  let phone = args['phone'];
  let practitioner = args['practitioner'];
  let role = args['role'];
  let service = args['service'];
  let specialty = args['specialty'];
  let telecom = args['telecom'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (active) {
    query.active = stringQueryBuilder(active);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (email) {
    query.email = stringQueryBuilder(email);
  }

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (phone) {
    query.phone = stringQueryBuilder(phone);
  }

  if (practitioner) {
    let queryBuilder = referenceQueryBuilder(practitioner, 'practitioner');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (role) {
    query.role = stringQueryBuilder(role);
  }

  if (service) {
    query.service = stringQueryBuilder(service);
  }

  if (specialty) {
    query.specialty = stringQueryBuilder(specialty);
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

  // Practitionerrole search params for DSTU2
  let active = args['active'];
  let date = args['date'];
  let email = args['email'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let location = args['location'];
  let organization = args['organization'];
  let phone = args['phone'];
  let practitioner = args['practitioner'];
  let role = args['role'];
  let service = args['service'];
  let specialty = args['specialty'];
  let telecom = args['telecom'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (active) {
    query.active = stringQueryBuilder(active);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (email) {
    query.email = stringQueryBuilder(email);
  }

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (location) {
    query.location = stringQueryBuilder(location);
  }

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (phone) {
    query.phone = stringQueryBuilder(phone);
  }

  if (practitioner) {
    let queryBuilder = referenceQueryBuilder(practitioner, 'practitioner');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (role) {
    query.role = stringQueryBuilder(role);
  }

  if (service) {
    query.service = stringQueryBuilder(service);
  }

  if (specialty) {
    query.specialty = stringQueryBuilder(specialty);
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
  logger.info('Practitionerrole >>> search');

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
  let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${base_version}`);
  let Practitionerrole = getPractitionerrole(base_version);

  try {
    // Query our collection for this practitionerrole
    const cursor = collection.find(query);
    const practitionerroles = await cursor.toArray();

    practitionerroles.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Practitionerrole(element);
    });

    return toSearchBundle(practitionerroles);
  } catch (err) {
    logger.error('Error with Practitionerrole.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Practitionerrole >>> searchById');

  let { base_version, id } = args;
  let Practitionerrole = getPractitionerrole(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${base_version}`);

  try {
    // Query our collection for this practitionerrole
    const practitionerrole = await collection.findOne({ id: id.toString() });

    if (practitionerrole) {
      delete practitionerrole._id;
      return new Practitionerrole(practitionerrole);
    }
    return null;
  } catch (err) {
    logger.error('Error with Practitionerrole.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitionerrole >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${base_version}`);

    // Get current record
    let Practitionerrole = getPractitionerrole(base_version);
    let practitionerrole = new Practitionerrole(resource);
    delete practitionerrole._id;

    // If no resource ID was provided, generate one.
    let id = practitionerrole.id || getUuid();
    if (!practitionerrole.id) {
      practitionerrole.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    practitionerrole.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(practitionerrole));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Practitionerrole created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitionerrole >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${base_version}`);

    // Get current record
    let Practitionerrole = getPractitionerrole(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Practitionerrole Class
    let practitionerrole = new Practitionerrole(resource);
    delete practitionerrole._id;
    practitionerrole.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(practitionerrole));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Practitionerrole updated with id: ' + id);
      resolve({
        id: practitionerrole.id,
        created: false,
        resource_version: practitionerrole.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitionerrole >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Practitionerrole deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitionerrole >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Practitionerrole = getPractitionerrole(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${base_version}`);

    // Query our collection for this practitionerrole with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((practitionerrole) => {
      if (practitionerrole) {
        delete practitionerrole._id;
        resolve(new Practitionerrole(practitionerrole));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitionerrole >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let active = args['active'];
    let date = args['date'];
    let email = args['email'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let location = args['location'];
    let organization = args['organization'];
    let phone = args['phone'];
    let practitioner = args['practitioner'];
    let role = args['role'];
    let service = args['service'];
    let specialty = args['specialty'];
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
    let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${base_version}`);
    let Practitionerrole = getPractitionerrole(base_version);

    // Query our collection for practitionerrole history
    collection.find(query).toArray().then((practitionerroles) => {
      practitionerroles.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Practitionerrole(element);
      });
      resolve(practitionerroles);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Practitionerrole >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let active = args['active'];
    let date = args['date'];
    let email = args['email'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let location = args['location'];
    let organization = args['organization'];
    let phone = args['phone'];
    let practitioner = args['practitioner'];
    let role = args['role'];
    let service = args['service'];
    let specialty = args['specialty'];
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
    let collection = db.collection(`${COLLECTION.PRACTITIONERROLE}_${base_version}`);
    let Practitionerrole = getPractitionerrole(base_version);

    // Query our collection for practitionerrole history by id
    collection.find(query).toArray().then((practitionerroles) => {
      practitionerroles.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Practitionerrole(element);
      });
      resolve(practitionerroles);
    }).catch(_reject);
  });
