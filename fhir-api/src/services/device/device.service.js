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

let getDevice = (base_version) => {
  return resolveSchema(base_version, 'Device');
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

  // Device search params
  let device_name = args['device_name'];
  let identifier = args['identifier'];
  let location = args['location'];
  let manufacturer = args['manufacturer'];
  let model = args['model'];
  let organization = args['organization'];
  let patient = args['patient'];
  let status = args['status'];
  let type = args['type'];
  let udi_carrier = args['udi_carrier'];
  let udi_di = args['udi_di'];
  let url = args['url'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (device_name) {
    query.device_name = stringQueryBuilder(device_name);
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

  if (manufacturer) {
    query.manufacturer = stringQueryBuilder(manufacturer);
  }

  if (model) {
    query.model = stringQueryBuilder(model);
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

  if (udi_carrier) {
    query.udi_carrier = stringQueryBuilder(udi_carrier);
  }

  if (udi_di) {
    query.udi_di = stringQueryBuilder(udi_di);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
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

  // Device search params for DSTU2
  let device_name = args['device_name'];
  let identifier = args['identifier'];
  let location = args['location'];
  let manufacturer = args['manufacturer'];
  let model = args['model'];
  let organization = args['organization'];
  let patient = args['patient'];
  let status = args['status'];
  let type = args['type'];
  let udi_carrier = args['udi_carrier'];
  let udi_di = args['udi_di'];
  let url = args['url'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (device_name) {
    query.device_name = stringQueryBuilder(device_name);
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

  if (manufacturer) {
    query.manufacturer = stringQueryBuilder(manufacturer);
  }

  if (model) {
    query.model = stringQueryBuilder(model);
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

  if (udi_carrier) {
    query.udi_carrier = stringQueryBuilder(udi_carrier);
  }

  if (udi_di) {
    query.udi_di = stringQueryBuilder(udi_di);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Device >>> search');

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
  let collection = db.collection(`${COLLECTION.DEVICE}_${base_version}`);
  let Device = getDevice(base_version);

  try {
    // Query our collection for this device
    const cursor = collection.find(query);
    const devices = await cursor.toArray();

    devices.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Device(element);
    });

    return toSearchBundle(devices);
  } catch (err) {
    logger.error('Error with Device.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Device >>> searchById');

  let { base_version, id } = args;
  let Device = getDevice(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.DEVICE}_${base_version}`);

  try {
    // Query our collection for this device
    const device = await collection.findOne({ id: id.toString() });

    if (device) {
      delete device._id;
      return new Device(device);
    }
    return null;
  } catch (err) {
    logger.error('Error with Device.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Device >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICE}_${base_version}`);

    // Get current record
    let Device = getDevice(base_version);
    let device = new Device(resource);
    delete device._id;

    // If no resource ID was provided, generate one.
    let id = device.id || getUuid();
    if (!device.id) {
      device.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    device.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(device));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Device created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Device >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICE}_${base_version}`);

    // Get current record
    let Device = getDevice(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Device Class
    let device = new Device(resource);
    delete device._id;
    device.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(device));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Device updated with id: ' + id);
      resolve({
        id: device.id,
        created: false,
        resource_version: device.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Device >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Device deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Device >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Device = getDevice(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.DEVICE}_${base_version}`);

    // Query our collection for this device with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((device) => {
      if (device) {
        delete device._id;
        resolve(new Device(device));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Device >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let device_name = args['device_name'];
    let identifier = args['identifier'];
    let location = args['location'];
    let manufacturer = args['manufacturer'];
    let model = args['model'];
    let organization = args['organization'];
    let patient = args['patient'];
    let status = args['status'];
    let type = args['type'];
    let udi_carrier = args['udi_carrier'];
    let udi_di = args['udi_di'];
    let url = args['url'];

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
    let collection = db.collection(`${COLLECTION.DEVICE}_${base_version}`);
    let Device = getDevice(base_version);

    // Query our collection for device history
    collection.find(query).toArray().then((devices) => {
      devices.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Device(element);
      });
      resolve(devices);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Device >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let device_name = args['device_name'];
    let identifier = args['identifier'];
    let location = args['location'];
    let manufacturer = args['manufacturer'];
    let model = args['model'];
    let organization = args['organization'];
    let patient = args['patient'];
    let status = args['status'];
    let type = args['type'];
    let udi_carrier = args['udi_carrier'];
    let udi_di = args['udi_di'];
    let url = args['url'];

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
    let collection = db.collection(`${COLLECTION.DEVICE}_${base_version}`);
    let Device = getDevice(base_version);

    // Query our collection for device history by id
    collection.find(query).toArray().then((devices) => {
      devices.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Device(element);
      });
      resolve(devices);
    }).catch(_reject);
  });
