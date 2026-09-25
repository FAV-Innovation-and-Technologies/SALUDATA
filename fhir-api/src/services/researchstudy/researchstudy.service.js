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

let getResearchstudy = (base_version) => {
  return resolveSchema(base_version, 'Researchstudy');
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

  // Researchstudy search params
  let category = args['category'];
  let date = args['date'];
  let focus = args['focus'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let keyword = args['keyword'];
  let partof = args['partof'];
  let principalinvestigator = args['principalinvestigator'];
  let protocol = args['protocol'];
  let site = args['site'];
  let sponsor = args['sponsor'];
  let status = args['status'];
  let title = args['title'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (focus) {
    query.focus = stringQueryBuilder(focus);
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

  if (keyword) {
    query.keyword = stringQueryBuilder(keyword);
  }

  if (partof) {
    query.partof = stringQueryBuilder(partof);
  }

  if (principalinvestigator) {
    query.principalinvestigator = stringQueryBuilder(principalinvestigator);
  }

  if (protocol) {
    query.protocol = stringQueryBuilder(protocol);
  }

  if (site) {
    query.site = stringQueryBuilder(site);
  }

  if (sponsor) {
    query.sponsor = stringQueryBuilder(sponsor);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
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

  // Researchstudy search params for DSTU2
  let category = args['category'];
  let date = args['date'];
  let focus = args['focus'];
  let identifier = args['identifier'];
  let jurisdiction = args['jurisdiction'];
  let keyword = args['keyword'];
  let partof = args['partof'];
  let principalinvestigator = args['principalinvestigator'];
  let protocol = args['protocol'];
  let site = args['site'];
  let sponsor = args['sponsor'];
  let status = args['status'];
  let title = args['title'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (focus) {
    query.focus = stringQueryBuilder(focus);
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

  if (keyword) {
    query.keyword = stringQueryBuilder(keyword);
  }

  if (partof) {
    query.partof = stringQueryBuilder(partof);
  }

  if (principalinvestigator) {
    query.principalinvestigator = stringQueryBuilder(principalinvestigator);
  }

  if (protocol) {
    query.protocol = stringQueryBuilder(protocol);
  }

  if (site) {
    query.site = stringQueryBuilder(site);
  }

  if (sponsor) {
    query.sponsor = stringQueryBuilder(sponsor);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (title) {
    query.title = stringQueryBuilder(title);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Researchstudy >>> search');

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
  let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${base_version}`);
  let Researchstudy = getResearchstudy(base_version);

  try {
    // Query our collection for this researchstudy
    const cursor = collection.find(query);
    const researchstudys = await cursor.toArray();

    researchstudys.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Researchstudy(element);
    });

    return toSearchBundle(researchstudys);
  } catch (err) {
    logger.error('Error with Researchstudy.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Researchstudy >>> searchById');

  let { base_version, id } = args;
  let Researchstudy = getResearchstudy(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${base_version}`);

  try {
    // Query our collection for this researchstudy
    const researchstudy = await collection.findOne({ id: id.toString() });

    if (researchstudy) {
      delete researchstudy._id;
      return new Researchstudy(researchstudy);
    }
    return null;
  } catch (err) {
    logger.error('Error with Researchstudy.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchstudy >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${base_version}`);

    // Get current record
    let Researchstudy = getResearchstudy(base_version);
    let researchstudy = new Researchstudy(resource);
    delete researchstudy._id;

    // If no resource ID was provided, generate one.
    let id = researchstudy.id || getUuid();
    if (!researchstudy.id) {
      researchstudy.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    researchstudy.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(researchstudy));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Researchstudy created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchstudy >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${base_version}`);

    // Get current record
    let Researchstudy = getResearchstudy(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Researchstudy Class
    let researchstudy = new Researchstudy(resource);
    delete researchstudy._id;
    researchstudy.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(researchstudy));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Researchstudy updated with id: ' + id);
      resolve({
        id: researchstudy.id,
        created: false,
        resource_version: researchstudy.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchstudy >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Researchstudy deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchstudy >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Researchstudy = getResearchstudy(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${base_version}`);

    // Query our collection for this researchstudy with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((researchstudy) => {
      if (researchstudy) {
        delete researchstudy._id;
        resolve(new Researchstudy(researchstudy));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchstudy >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let date = args['date'];
    let focus = args['focus'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let keyword = args['keyword'];
    let partof = args['partof'];
    let principalinvestigator = args['principalinvestigator'];
    let protocol = args['protocol'];
    let site = args['site'];
    let sponsor = args['sponsor'];
    let status = args['status'];
    let title = args['title'];

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
    let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${base_version}`);
    let Researchstudy = getResearchstudy(base_version);

    // Query our collection for researchstudy history
    collection.find(query).toArray().then((researchstudys) => {
      researchstudys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Researchstudy(element);
      });
      resolve(researchstudys);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Researchstudy >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let category = args['category'];
    let date = args['date'];
    let focus = args['focus'];
    let identifier = args['identifier'];
    let jurisdiction = args['jurisdiction'];
    let keyword = args['keyword'];
    let partof = args['partof'];
    let principalinvestigator = args['principalinvestigator'];
    let protocol = args['protocol'];
    let site = args['site'];
    let sponsor = args['sponsor'];
    let status = args['status'];
    let title = args['title'];

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
    let collection = db.collection(`${COLLECTION.RESEARCHSTUDY}_${base_version}`);
    let Researchstudy = getResearchstudy(base_version);

    // Query our collection for researchstudy history by id
    collection.find(query).toArray().then((researchstudys) => {
      researchstudys.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Researchstudy(element);
      });
      resolve(researchstudys);
    }).catch(_reject);
  });
