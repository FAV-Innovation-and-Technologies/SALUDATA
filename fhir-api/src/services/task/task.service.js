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

let getTask = (base_version) => {
  return resolveSchema(base_version, 'Task');
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

  // Task search params
  let authored_on = args['authored_on'];
  let based_on = args['based_on'];
  let business_status = args['business_status'];
  let code = args['code'];
  let focus = args['focus'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let modified = args['modified'];
  let organization = args['organization'];
  let owner = args['owner'];
  let part_of = args['part_of'];
  let patient = args['patient'];
  let performer = args['performer'];
  let period = args['period'];
  let priority = args['priority'];
  let requester = args['requester'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authored_on) {
    query.authored_on = stringQueryBuilder(authored_on);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (business_status) {
    let queryBuilder = tokenQueryBuilder(business_status, 'code', 'business_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (focus) {
    query.focus = stringQueryBuilder(focus);
  }

  if (group_identifier) {
    let queryBuilder = tokenQueryBuilder(group_identifier, 'value', 'identifier');
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (modified) {
    query.modified = stringQueryBuilder(modified);
  }

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (owner) {
    query.owner = stringQueryBuilder(owner);
  }

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
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

  // Task search params for DSTU2
  let authored_on = args['authored_on'];
  let based_on = args['based_on'];
  let business_status = args['business_status'];
  let code = args['code'];
  let focus = args['focus'];
  let group_identifier = args['group_identifier'];
  let identifier = args['identifier'];
  let intent = args['intent'];
  let modified = args['modified'];
  let organization = args['organization'];
  let owner = args['owner'];
  let part_of = args['part_of'];
  let patient = args['patient'];
  let performer = args['performer'];
  let period = args['period'];
  let priority = args['priority'];
  let requester = args['requester'];
  let status = args['status'];
  let subject = args['subject'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (authored_on) {
    query.authored_on = stringQueryBuilder(authored_on);
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (business_status) {
    let queryBuilder = tokenQueryBuilder(business_status, 'code', 'business_status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (focus) {
    query.focus = stringQueryBuilder(focus);
  }

  if (group_identifier) {
    let queryBuilder = tokenQueryBuilder(group_identifier, 'value', 'identifier');
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

  if (intent) {
    query.intent = stringQueryBuilder(intent);
  }

  if (modified) {
    query.modified = stringQueryBuilder(modified);
  }

  if (organization) {
    let queryBuilder = referenceQueryBuilder(organization, 'organization');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (owner) {
    query.owner = stringQueryBuilder(owner);
  }

  if (part_of) {
    query.part_of = stringQueryBuilder(part_of);
  }

  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'patient');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (period) {
    let queryBuilder = dateQueryBuilder(period, 'date', 'period');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (priority) {
    query.priority = stringQueryBuilder(priority);
  }

  if (requester) {
    query.requester = stringQueryBuilder(requester);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject');
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
  logger.info('Task >>> search');

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
  let collection = db.collection(`${COLLECTION.TASK}_${base_version}`);
  let Task = getTask(base_version);

  try {
    // Query our collection for this task
    const cursor = collection.find(query);
    const tasks = await cursor.toArray();

    tasks.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Task(element);
    });

    return toSearchBundle(tasks);
  } catch (err) {
    logger.error('Error with Task.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Task >>> searchById');

  let { base_version, id } = args;
  let Task = getTask(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.TASK}_${base_version}`);

  try {
    // Query our collection for this task
    const task = await collection.findOne({ id: id.toString() });

    if (task) {
      delete task._id;
      return new Task(task);
    }
    return null;
  } catch (err) {
    logger.error('Error with Task.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Task >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TASK}_${base_version}`);

    // Get current record
    let Task = getTask(base_version);
    let task = new Task(resource);
    delete task._id;

    // If no resource ID was provided, generate one.
    let id = task.id || getUuid();
    if (!task.id) {
      task.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    task.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(task));
    delete doc._id;
    collection.insertOne(doc).then((_result) => {
      logger.info('Task created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Task >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TASK}_${base_version}`);

    // Get current record
    let Task = getTask(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Task Class
    let task = new Task(resource);
    delete task._id;
    task.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(task));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Task updated with id: ' + id);
      resolve({
        id: task.id,
        created: false,
        resource_version: task.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Task >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TASK}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Task deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Task >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Task = getTask(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.TASK}_${base_version}`);

    // Query our collection for this task with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((task) => {
      if (task) {
        delete task._id;
        resolve(new Task(task));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Task >>> history');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authored_on = args['authored_on'];
    let based_on = args['based_on'];
    let business_status = args['business_status'];
    let code = args['code'];
    let focus = args['focus'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let modified = args['modified'];
    let organization = args['organization'];
    let owner = args['owner'];
    let part_of = args['part_of'];
    let patient = args['patient'];
    let performer = args['performer'];
    let period = args['period'];
    let priority = args['priority'];
    let requester = args['requester'];
    let status = args['status'];
    let subject = args['subject'];

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
    let collection = db.collection(`${COLLECTION.TASK}_${base_version}`);
    let Task = getTask(base_version);

    // Query our collection for task history
    collection.find(query).toArray().then((tasks) => {
      tasks.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Task(element);
      });
      resolve(tasks);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Task >>> historyById');

    let { base_version } = args;

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let authored_on = args['authored_on'];
    let based_on = args['based_on'];
    let business_status = args['business_status'];
    let code = args['code'];
    let focus = args['focus'];
    let group_identifier = args['group_identifier'];
    let identifier = args['identifier'];
    let intent = args['intent'];
    let modified = args['modified'];
    let organization = args['organization'];
    let owner = args['owner'];
    let part_of = args['part_of'];
    let patient = args['patient'];
    let performer = args['performer'];
    let period = args['period'];
    let priority = args['priority'];
    let requester = args['requester'];
    let status = args['status'];
    let subject = args['subject'];

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
    let collection = db.collection(`${COLLECTION.TASK}_${base_version}`);
    let Task = getTask(base_version);

    // Query our collection for task history by id
    collection.find(query).toArray().then((tasks) => {
      tasks.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Task(element);
      });
      resolve(tasks);
    }).catch(_reject);
  });
