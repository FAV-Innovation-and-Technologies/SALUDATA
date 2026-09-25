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

let getMeasure = (base_version) => {
  return resolveSchema(base_version, 'Measure');
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

  // Measure search params
  let composed_of = args['composed_of'];
  let date = args['date'];
  let depends_on = args['depends_on'];
  let derived_from = args['derived_from'];
  let description = args['description'];
  let effective = args['effective'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let predecessor = args['predecessor'];
  let publisher = args['publisher'];
  let status = args['status'];
  let successor = args['successor'];
  let title = args['title'];
  let topic = args['topic'];
  let url = args['url'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (composed_of) {
    query.composed_of = stringQueryBuilder(composed_of);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (depends_on) {
    query.depends_on = stringQueryBuilder(depends_on);
  }

  if (derived_from) {
    query.derived_from = stringQueryBuilder(derived_from);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (effective) {
    query.effective = stringQueryBuilder(effective);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (predecessor) {
    query.predecessor = stringQueryBuilder(predecessor);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (successor) {
    query.successor = stringQueryBuilder(successor);
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (topic) {
    query.topic = stringQueryBuilder(topic);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (version) {
    query.version = stringQueryBuilder(version);
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

  // Measure search params for DSTU2
  let composed_of = args['composed_of'];
  let date = args['date'];
  let depends_on = args['depends_on'];
  let derived_from = args['derived_from'];
  let description = args['description'];
  let effective = args['effective'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let name = args['name'];
  let predecessor = args['predecessor'];
  let publisher = args['publisher'];
  let status = args['status'];
  let successor = args['successor'];
  let title = args['title'];
  let topic = args['topic'];
  let url = args['url'];
  let version = args['version'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (composed_of) {
    query.composed_of = stringQueryBuilder(composed_of);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (depends_on) {
    query.depends_on = stringQueryBuilder(depends_on);
  }

  if (derived_from) {
    query.derived_from = stringQueryBuilder(derived_from);
  }

  if (description) {
    query.description = stringQueryBuilder(description);
  }

  if (effective) {
    query.effective = stringQueryBuilder(effective);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (jurisdiction) {
    query.jurisdiction = stringQueryBuilder(jurisdiction);
  }

  if (name) {
    query.name = stringQueryBuilder(name);
  }

  if (predecessor) {
    query.predecessor = stringQueryBuilder(predecessor);
  }

  if (publisher) {
    query.publisher = stringQueryBuilder(publisher);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (successor) {
    query.successor = stringQueryBuilder(successor);
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (topic) {
    query.topic = stringQueryBuilder(topic);
  }

  if (url) {
    query.url = stringQueryBuilder(url);
  }

  if (version) {
    query.version = stringQueryBuilder(version);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Measure >>> search');

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
  let collection = db.collection(`${COLLECTION.MEASURE}_${base_version}`);
  let Measure = getMeasure(base_version);

  try {
    // Query our collection for this measure
    const cursor = collection.find(query);
    const measures = await cursor.toArray();

    measures.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Measure(element);
    });

    return toSearchBundle(measures);
  } catch (err) {
    logger.error('Error with Measure.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Measure >>> searchById');

  let { base_version, id } = args;
  let Measure = getMeasure(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.MEASURE}_${base_version}`);

  try {
    // Query our collection for this measure
    const measure = await collection.findOne({ id: id.toString() });

    if (measure) {
      delete measure._id;
      return new Measure(measure);
    }
    return null;
  } catch (err) {
    logger.error('Error with Measure.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Measure >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEASURE}_${base_version}`);

    // Get current record
    let Measure = getMeasure(base_version);
    let measure = new Measure(resource);
    delete measure._id;

    // If no resource ID was provided, generate one.
    let id = measure.id || getUuid();
    if (!measure.id) {
      measure.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    measure.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(measure));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Measure created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Measure >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEASURE}_${base_version}`);

    // Get current record
    let Measure = getMeasure(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Measure Class
    let measure = new Measure(resource);
    delete measure._id;
    measure.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(measure));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Measure updated with id: ' + id);
      resolve({
        id: measure.id,
        created: false,
        resource_version: measure.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Measure >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEASURE}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Measure deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Measure >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Measure = getMeasure(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.MEASURE}_${base_version}`);

    // Query our collection for this measure with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((measure) => {
      if (measure) {
        delete measure._id;
        resolve(new Measure(measure));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Measure >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let composed_of = args['composed_of'];
    let date = args['date'];
    let depends_on = args['depends_on'];
    let derived_from = args['derived_from'];
    let description = args['description'];
    let effective = args['effective'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let predecessor = args['predecessor'];
    let publisher = args['publisher'];
    let status = args['status'];
    let successor = args['successor'];
    let title = args['title'];
    let topic = args['topic'];
    let url = args['url'];
    let version = args['version'];

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
    let collection = db.collection(`${COLLECTION.MEASURE}_${base_version}`);
    let Measure = getMeasure(base_version);

    // Query our collection for measure history
    collection.find(query).toArray().then((measures) => {
      measures.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Measure(element);
      });
      resolve(measures);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Measure >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let composed_of = args['composed_of'];
    let date = args['date'];
    let depends_on = args['depends_on'];
    let derived_from = args['derived_from'];
    let description = args['description'];
    let effective = args['effective'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let name = args['name'];
    let predecessor = args['predecessor'];
    let publisher = args['publisher'];
    let status = args['status'];
    let successor = args['successor'];
    let title = args['title'];
    let topic = args['topic'];
    let url = args['url'];
    let version = args['version'];

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
    let collection = db.collection(`${COLLECTION.MEASURE}_${base_version}`);
    let Measure = getMeasure(base_version);

    // Query our collection for measure history by id
    collection.find(query).toArray().then((measures) => {
      measures.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Measure(element);
      });
      resolve(measures);
    }).catch(_reject);
  });
