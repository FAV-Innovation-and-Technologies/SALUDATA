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

let getNamingsystem = (base_version) => {
  return resolveSchema(base_version, 'Namingsystem');
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

  // Namingsystem search params
  let contact = args['contact'];
  let date = args['date'];
  let description = args['description'];
  let id_type = args['id_type'];
  let jurisdiction = args['jurisdiction'];
  let kind = args['kind'];
  let name = args['name'];
  let period = args['period'];
  let publisher = args['publisher'];
  let replaced_by = args['replaced_by'];
  let responsible = args['responsible'];
  let status = args['status'];
  let telecom = args['telecom'];
  let type = args['type'];
  let value = args['value'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (contact) {
    query.contact = stringQueryBuilder(contact);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (id_type) {
    let queryBuilder = tokenQueryBuilder(id_type, 'code', 'id_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (kind) {
    query.kind = stringQueryBuilder(kind);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (replaced_by) {
    query.replaced_by = stringQueryBuilder(replaced_by);
  }

  if (responsible) {
    query.responsible = stringQueryBuilder(responsible);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (telecom) {
    query.telecom = stringQueryBuilder(telecom);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (value) {
    query.value = stringQueryBuilder(value);
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

  // Namingsystem search params for DSTU2
  let contact = args['contact'];
  let date = args['date'];
  let description = args['description'];
  let id_type = args['id_type'];
  let jurisdiction = args['jurisdiction'];
  let kind = args['kind'];
  let name = args['name'];
  let period = args['period'];
  let publisher = args['publisher'];
  let replaced_by = args['replaced_by'];
  let responsible = args['responsible'];
  let status = args['status'];
  let telecom = args['telecom'];
  let type = args['type'];
  let value = args['value'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (contact) {
    query.contact = stringQueryBuilder(contact);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (id_type) {
    let queryBuilder = tokenQueryBuilder(id_type, 'code', 'id_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (kind) {
    query.kind = stringQueryBuilder(kind);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (replaced_by) {
    query.replaced_by = stringQueryBuilder(replaced_by);
  }

  if (responsible) {
    query.responsible = stringQueryBuilder(responsible);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (telecom) {
    query.telecom = stringQueryBuilder(telecom);
  }

  if (type) {
    let queryBuilder = tokenQueryBuilder(type, 'code', 'type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (value) {
    query.value = stringQueryBuilder(value);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Namingsystem >>> search');

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
  let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${base_version}`);
  let Namingsystem = getNamingsystem(base_version);

  try {
    // Query our collection for this namingsystem
    const cursor = collection.find(query);
    const namingsystems = await cursor.toArray();

    namingsystems.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Namingsystem(element);
    });

    return toSearchBundle(namingsystems);
  } catch (err) {
    logger.error('Error with Namingsystem.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Namingsystem >>> searchById');

  let { base_version, id } = args;
  let Namingsystem = getNamingsystem(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${base_version}`);

  try {
    // Query our collection for this namingsystem
    const namingsystem = await collection.findOne({ id: id.toString() });

    if (namingsystem) {
      delete namingsystem._id;
      return new Namingsystem(namingsystem);
    }
    return null;
  } catch (err) {
    logger.error('Error with Namingsystem.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Namingsystem >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${base_version}`);

    // Get current record
    let Namingsystem = getNamingsystem(base_version);
    let namingsystem = new Namingsystem(resource);
    delete namingsystem._id;

    // If no resource ID was provided, generate one.
    let id = namingsystem.id || getUuid();
    if (!namingsystem.id) {
      namingsystem.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    namingsystem.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(namingsystem));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Namingsystem created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Namingsystem >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${base_version}`);

    // Get current record
    let Namingsystem = getNamingsystem(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Namingsystem Class
    let namingsystem = new Namingsystem(resource);
    delete namingsystem._id;
    namingsystem.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(namingsystem));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Namingsystem updated with id: ' + id);
      resolve({
        id: namingsystem.id,
        created: false,
        resource_version: namingsystem.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Namingsystem >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Namingsystem deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Namingsystem >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Namingsystem = getNamingsystem(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${base_version}`);

    // Query our collection for this namingsystem with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((namingsystem) => {
      if (namingsystem) {
        delete namingsystem._id;
        resolve(new Namingsystem(namingsystem));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Namingsystem >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let contact = args['contact'];
    let date = args['date'];
    let description = args['description'];
    let id_type = args['id_type'];
    let jurisdiction = args['jurisdiction'];
    let kind = args['kind'];
    let name = args['name'];
    let period = args['period'];
    let publisher = args['publisher'];
    let replaced_by = args['replaced_by'];
    let responsible = args['responsible'];
    let status = args['status'];
    let telecom = args['telecom'];
    let type = args['type'];
    let value = args['value'];

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
    let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${base_version}`);
    let Namingsystem = getNamingsystem(base_version);

    // Query our collection for namingsystem history
    collection.find(query).toArray().then((namingsystems) => {
      namingsystems.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Namingsystem(element);
      });
      resolve(namingsystems);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Namingsystem >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let contact = args['contact'];
    let date = args['date'];
    let description = args['description'];
    let id_type = args['id_type'];
    let jurisdiction = args['jurisdiction'];
    let kind = args['kind'];
    let name = args['name'];
    let period = args['period'];
    let publisher = args['publisher'];
    let replaced_by = args['replaced_by'];
    let responsible = args['responsible'];
    let status = args['status'];
    let telecom = args['telecom'];
    let type = args['type'];
    let value = args['value'];

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
    let collection = db.collection(`${COLLECTION.NAMINGSYSTEM}_${base_version}`);
    let Namingsystem = getNamingsystem(base_version);

    // Query our collection for namingsystem history by id
    collection.find(query).toArray().then((namingsystems) => {
      namingsystems.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Namingsystem(element);
      });
      resolve(namingsystems);
    }).catch(_reject);
  });
