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

let getLocation = (base_version) => {
  return resolveSchema(base_version, 'Location');
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

  // Location search params
  let address = args['address'];
  let address_city = args['address_city'];
  let address_country = args['address_country'];
  let address_postalcode = args['address_postalcode'];
  let address_state = args['address_state'];
  let address_use = args['address_use'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let name = args['name'];
  let near = args['near'];
  let near_distance = args['near_distance'];
  let operational_status = args['operational_status'];
  let organization = args['organization'];
  let partof = args['partof'];
  let status = args['status'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
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

  if (near) {
    query.near = stringQueryBuilder(near);
  }

  if (near_distance) {
    query.near_distance = stringQueryBuilder(near_distance);
  }

  if (operational_status) {
    let queryBuilder = tokenQueryBuilder(operational_status, 'code', 'operational_status.coding');
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

  if (partof) {
    query.partof = stringQueryBuilder(partof);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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

  // Location search params for DSTU2
  let address = args['address'];
  let address_city = args['address_city'];
  let address_country = args['address_country'];
  let address_postalcode = args['address_postalcode'];
  let address_state = args['address_state'];
  let address_use = args['address_use'];
  let endpoint = args['endpoint'];
  let identifier = args['identifier'];
  let name = args['name'];
  let near = args['near'];
  let near_distance = args['near_distance'];
  let operational_status = args['operational_status'];
  let organization = args['organization'];
  let partof = args['partof'];
  let status = args['status'];
  let type = args['type'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
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

  if (endpoint) {
    query.endpoint = stringQueryBuilder(endpoint);
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

  if (near) {
    query.near = stringQueryBuilder(near);
  }

  if (near_distance) {
    query.near_distance = stringQueryBuilder(near_distance);
  }

  if (operational_status) {
    let queryBuilder = tokenQueryBuilder(operational_status, 'code', 'operational_status.coding');
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

  if (partof) {
    query.partof = stringQueryBuilder(partof);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
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

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Location >>> search');

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
  let collection = db.collection(`${COLLECTION.LOCATION}_${base_version}`);
  let Location = getLocation(base_version);

  try {
    // Query our collection for this location
    const cursor = collection.find(query);
    const locations = await cursor.toArray();

    locations.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Location(element);
    });

    return toSearchBundle(locations);
  } catch (err) {
    logger.error('Error with Location.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Location >>> searchById');

  let { base_version, id } = args;
  let Location = getLocation(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.LOCATION}_${base_version}`);

  try {
    // Query our collection for this location
    const location = await collection.findOne({ id: id.toString() });

    if (location) {
      delete location._id;
      return new Location(location);
    }
    return null;
  } catch (err) {
    logger.error('Error with Location.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Location >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LOCATION}_${base_version}`);

    // Get current record
    let Location = getLocation(base_version);
    let location = new Location(resource);
    delete location._id;

    // If no resource ID was provided, generate one.
    let id = location.id || getUuid();
    if (!location.id) {
      location.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    location.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(location));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Location created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Location >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LOCATION}_${base_version}`);

    // Get current record
    let Location = getLocation(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Location Class
    let location = new Location(resource);
    delete location._id;
    location.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(location));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Location updated with id: ' + id);
      resolve({
        id: location.id,
        created: false,
        resource_version: location.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Location >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LOCATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Location deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Location >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Location = getLocation(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.LOCATION}_${base_version}`);

    // Query our collection for this location with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((location) => {
      if (location) {
        delete location._id;
        resolve(new Location(location));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Location >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let address = args['address'];
    let address_city = args['address_city'];
    let address_country = args['address_country'];
    let address_postalcode = args['address_postalcode'];
    let address_state = args['address_state'];
    let address_use = args['address_use'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let name = args['name'];
    let near = args['near'];
    let near_distance = args['near_distance'];
    let operational_status = args['operational_status'];
    let organization = args['organization'];
    let partof = args['partof'];
    let status = args['status'];
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
    let collection = db.collection(`${COLLECTION.LOCATION}_${base_version}`);
    let Location = getLocation(base_version);

    // Query our collection for location history
    collection.find(query).toArray().then((locations) => {
      locations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Location(element);
      });
      resolve(locations);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Location >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let address = args['address'];
    let address_city = args['address_city'];
    let address_country = args['address_country'];
    let address_postalcode = args['address_postalcode'];
    let address_state = args['address_state'];
    let address_use = args['address_use'];
    let endpoint = args['endpoint'];
    let identifier = args['identifier'];
    let name = args['name'];
    let near = args['near'];
    let near_distance = args['near_distance'];
    let operational_status = args['operational_status'];
    let organization = args['organization'];
    let partof = args['partof'];
    let status = args['status'];
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
    let collection = db.collection(`${COLLECTION.LOCATION}_${base_version}`);
    let Location = getLocation(base_version);

    // Query our collection for location history by id
    collection.find(query).toArray().then((locations) => {
      locations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Location(element);
      });
      resolve(locations);
    }).catch(_reject);
  });
