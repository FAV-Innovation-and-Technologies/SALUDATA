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

let getObservation = (base_version) => {
  return resolveSchema(base_version, 'Observation');
};

let getMeta = (base_version) => {
  return resolveSchema(base_version, 'Meta');
};

const ALERT_TAG = Object.freeze({
  system: 'https://saludata.favit.es/alert-engine',
  code: 'anomaly',
  display: 'Anomaly',
});

function sanitizeResourceDocument(document) {
  const resource = JSON.parse(JSON.stringify(document));
  if (resource._id) {
    delete resource._id;
  }
  return resource;
}

function hasAlertTag(tags) {
  return Array.isArray(tags) && tags.some((tag) => tag && tag.system === ALERT_TAG.system && tag.code === ALERT_TAG.code);
}

function getNextVersionId(versionId) {
  const parsedVersion = Number.parseInt(versionId, 10);
  if (Number.isNaN(parsedVersion)) {
    return versionId || '1';
  }
  return String(parsedVersion + 1);
}

function buildAlertError(code, message, diagnostics = message) {
  const error = new Error(message);
  error.code = code;
  error.diagnostics = diagnostics;
  return error;
}

let buildStu3SearchQuery = (args) => {
  // Common search params
  let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } = args;

  // Search Result params
  let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
    args;

  // Observation search params
  let based_on = args['based_on'];
  let category = args['category'];
  let code = args['code'];
  let code_value_concept = args['code_value_concept'];
  let code_value_date = args['code_value_date'];
  let code_value_quantity = args['code_value_quantity'];
  let code_value_string = args['code_value_string'];
  let combo_code = args['combo_code'];
  let combo_code_value_concept = args['combo_code_value_concept'];
  let combo_code_value_quantity = args['combo_code_value_quantity'];
  let combo_data_absent_reason = args['combo_data_absent_reason'];
  let combo_value_concept = args['combo_value_concept'];
  let combo_value_quantity = args['combo_value_quantity'];
  let component_code = args['component_code'];
  let component_code_value_concept = args['component_code_value_concept'];
  let component_code_value_quantity = args['component_code_value_quantity'];
  let component_data_absent_reason = args['component_data_absent_reason'];
  let component_value_concept = args['component_value_concept'];
  let component_value_quantity = args['component_value_quantity'];
  let data_absent_reason = args['data_absent_reason'];
  let date = args['date'];
  let device = args['device'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let method = args['method'];
  // Alias FHIR: patient | subject
  let patient = args['patient'];
  let subject = args['subject'];
  let performer = args['performer'];
  let related = args['related'];
  let related_target = args['related_target'];
  let related_type = args['related_type'];
  let specimen = args['specimen'];
  let status = args['status'];
  let reference = args['reference'];
  let value_concept = args['value_concept'];
  let value_date = args['value_date'];
  let value_quantity = args['value_quantity'];
  let value_string = args['value_string'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (code_value_concept) {
    query.code_value_concept = stringQueryBuilder(code_value_concept);
  }

  if (code_value_date) {
    let queryBuilder = dateQueryBuilder(code_value_date, 'date', 'code_value_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code_value_quantity) {
    query.code_value_quantity = stringQueryBuilder(code_value_quantity);
  }

  if (code_value_string) {
    query.code_value_string = stringQueryBuilder(code_value_string);
  }

  if (combo_code) {
    query.combo_code = stringQueryBuilder(combo_code);
  }

  if (combo_code_value_concept) {
    query.combo_code_value_concept = stringQueryBuilder(combo_code_value_concept);
  }

  if (combo_code_value_quantity) {
    query.combo_code_value_quantity = stringQueryBuilder(combo_code_value_quantity);
  }

  if (combo_data_absent_reason) {
    query.combo_data_absent_reason = stringQueryBuilder(combo_data_absent_reason);
  }

  if (combo_value_concept) {
    query.combo_value_concept = stringQueryBuilder(combo_value_concept);
  }

  if (combo_value_quantity) {
    query.combo_value_quantity = stringQueryBuilder(combo_value_quantity);
  }

  if (component_code) {
    query.component_code = stringQueryBuilder(component_code);
  }

  if (component_code_value_concept) {
    query.component_code_value_concept = stringQueryBuilder(component_code_value_concept);
  }

  if (component_code_value_quantity) {
    query.component_code_value_quantity = stringQueryBuilder(component_code_value_quantity);
  }

  if (component_data_absent_reason) {
    query.component_data_absent_reason = stringQueryBuilder(component_data_absent_reason);
  }

  if (component_value_concept) {
    query.component_value_concept = stringQueryBuilder(component_value_concept);
  }

  if (component_value_quantity) {
    query.component_value_quantity = stringQueryBuilder(component_value_quantity);
  }

  if (data_absent_reason) {
    query.data_absent_reason = stringQueryBuilder(data_absent_reason);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (method) {
    query.method = stringQueryBuilder(method);
  }

  // FHIR R4: patient y subject son aliases; en Observation se almacena en subject.reference
  if (patient) {
    let queryBuilder = referenceQueryBuilder(patient, 'subject.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (subject) {
    let queryBuilder = referenceQueryBuilder(subject, 'subject.reference');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (performer) {
    query.performer = stringQueryBuilder(performer);
  }

  if (related) {
    query.related = stringQueryBuilder(related);
  }

  if (related_target) {
    query.related_target = stringQueryBuilder(related_target);
  }

  if (related_type) {
    let queryBuilder = tokenQueryBuilder(related_type, 'code', 'related_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (specimen) {
    query.specimen = stringQueryBuilder(specimen);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reference) {
    query.reference = stringQueryBuilder(reference);
  }

  if (value_concept) {
    query.value_concept = stringQueryBuilder(value_concept);
  }

  if (value_date) {
    let queryBuilder = dateQueryBuilder(value_date, 'date', 'value_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (value_quantity) {
    query.value_quantity = stringQueryBuilder(value_quantity);
  }

  if (value_string) {
    query.value_string = stringQueryBuilder(value_string);
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

  // Observation search params for DSTU2
  let based_on = args['based_on'];
  let category = args['category'];
  let code = args['code'];
  let code_value_concept = args['code_value_concept'];
  let code_value_date = args['code_value_date'];
  let code_value_quantity = args['code_value_quantity'];
  let code_value_string = args['code_value_string'];
  let combo_code = args['combo_code'];
  let combo_code_value_concept = args['combo_code_value_concept'];
  let combo_code_value_quantity = args['combo_code_value_quantity'];
  let combo_data_absent_reason = args['combo_data_absent_reason'];
  let combo_value_concept = args['combo_value_concept'];
  let combo_value_quantity = args['combo_value_quantity'];
  let component_code = args['component_code'];
  let component_code_value_concept = args['component_code_value_concept'];
  let component_code_value_quantity = args['component_code_value_quantity'];
  let component_data_absent_reason = args['component_data_absent_reason'];
  let component_value_concept = args['component_value_concept'];
  let component_value_quantity = args['component_value_quantity'];
  let data_absent_reason = args['data_absent_reason'];
  let date = args['date'];
  let device = args['device'];
  let encounter = args['encounter'];
  let identifier = args['identifier'];
  let method = args['method'];
  let patient = args['patient'];
  let performer = args['performer'];
  let related = args['related'];
  let related_target = args['related_target'];
  let related_type = args['related_type'];
  let specimen = args['specimen'];
  let status = args['status'];
  let reference = args['reference'];
  let value_concept = args['value_concept'];
  let value_date = args['value_date'];
  let value_quantity = args['value_quantity'];
  let value_string = args['value_string'];

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

  if (based_on) {
    query.based_on = stringQueryBuilder(based_on);
  }

  if (category) {
    let queryBuilder = tokenQueryBuilder(category, 'code', 'category.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code) {
    query.code = stringQueryBuilder(code);
  }

  if (code_value_concept) {
    query.code_value_concept = stringQueryBuilder(code_value_concept);
  }

  if (code_value_date) {
    let queryBuilder = dateQueryBuilder(code_value_date, 'date', 'code_value_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (code_value_quantity) {
    query.code_value_quantity = stringQueryBuilder(code_value_quantity);
  }

  if (code_value_string) {
    query.code_value_string = stringQueryBuilder(code_value_string);
  }

  if (combo_code) {
    query.combo_code = stringQueryBuilder(combo_code);
  }

  if (combo_code_value_concept) {
    query.combo_code_value_concept = stringQueryBuilder(combo_code_value_concept);
  }

  if (combo_code_value_quantity) {
    query.combo_code_value_quantity = stringQueryBuilder(combo_code_value_quantity);
  }

  if (combo_data_absent_reason) {
    query.combo_data_absent_reason = stringQueryBuilder(combo_data_absent_reason);
  }

  if (combo_value_concept) {
    query.combo_value_concept = stringQueryBuilder(combo_value_concept);
  }

  if (combo_value_quantity) {
    query.combo_value_quantity = stringQueryBuilder(combo_value_quantity);
  }

  if (component_code) {
    query.component_code = stringQueryBuilder(component_code);
  }

  if (component_code_value_concept) {
    query.component_code_value_concept = stringQueryBuilder(component_code_value_concept);
  }

  if (component_code_value_quantity) {
    query.component_code_value_quantity = stringQueryBuilder(component_code_value_quantity);
  }

  if (component_data_absent_reason) {
    query.component_data_absent_reason = stringQueryBuilder(component_data_absent_reason);
  }

  if (component_value_concept) {
    query.component_value_concept = stringQueryBuilder(component_value_concept);
  }

  if (component_value_quantity) {
    query.component_value_quantity = stringQueryBuilder(component_value_quantity);
  }

  if (data_absent_reason) {
    query.data_absent_reason = stringQueryBuilder(data_absent_reason);
  }

  if (date) {
    let queryBuilder = dateQueryBuilder(date, 'date', 'date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (device) {
    query.device = stringQueryBuilder(device);
  }

  if (encounter) {
    query.encounter = stringQueryBuilder(encounter);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (method) {
    query.method = stringQueryBuilder(method);
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

  if (related) {
    query.related = stringQueryBuilder(related);
  }

  if (related_target) {
    query.related_target = stringQueryBuilder(related_target);
  }

  if (related_type) {
    let queryBuilder = tokenQueryBuilder(related_type, 'code', 'related_type.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (specimen) {
    query.specimen = stringQueryBuilder(specimen);
  }

  if (status) {
    let queryBuilder = tokenQueryBuilder(status, 'code', 'status.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (reference) {
    query.reference = stringQueryBuilder(reference);
  }

  if (value_concept) {
    query.value_concept = stringQueryBuilder(value_concept);
  }

  if (value_date) {
    let queryBuilder = dateQueryBuilder(value_date, 'date', 'value_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (value_quantity) {
    query.value_quantity = stringQueryBuilder(value_quantity);
  }

  if (value_string) {
    query.value_string = stringQueryBuilder(value_string);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Observation >>> search');

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
  let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);
  let Observation = getObservation(base_version);

  try {
    // Query our collection for this observation
    const cursor = collection.find(query);
    const observations = await cursor.toArray();

    observations.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Observation(element);
    });

    return toSearchBundle(observations);
  } catch (err) {
    logger.error('Error with Observation.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Observation >>> searchById');

  let { base_version, id } = args;
  let Observation = getObservation(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

  try {
    // Query our collection for this observation
    const observation = await collection.findOne({ id: id.toString() });

    if (observation) {
      delete observation._id;
      return new Observation(observation);
    }
    return null;
  } catch (err) {
    logger.error('Error with Observation.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Observation >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

    // Get current record
    let Observation = getObservation(base_version);
    let observation = new Observation(resource);
    delete observation._id;

    // If no resource ID was provided, generate one.
    let id = observation.id || getUuid();
    if (!observation.id) {
      observation.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    observation.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    // Convert to plain object to prevent MongoDB from persisting internal _id Binary
    // Eliminar _id si existe para que MongoDB lo genere automáticamente
    let doc = JSON.parse(JSON.stringify(observation));
    if (doc._id) {
      delete doc._id;
    }
    collection.insertOne(doc).then((_result) => {
      logger.info('Observation created with id: ' + id);
      resolve({ id });
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Observation >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

    // Get current record
    let Observation = getObservation(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Observation Class
    let observation = new Observation(resource);
    delete observation._id;
    observation.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(observation));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Observation updated with id: ' + id);
      resolve({
        id: observation.id,
        created: false,
        resource_version: observation.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.markAsAlert = async (args) => {
  logger.info('Observation >>> markAsAlert');

  let { base_version, id } = args;
  let Observation = getObservation(base_version);

  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

  try {
    const observation = await collection.findOne({ id: id.toString() });

    if (!observation) {
      return null;
    }

    if (hasAlertTag(observation.meta && observation.meta.tag)) {
      return new Observation(sanitizeResourceDocument(observation));
    }

    const lastUpdated = moment.utc().format('YYYY-MM-DDTHH:mm:ssZ');
    const versionId = getNextVersionId(observation.meta && observation.meta.versionId);
    const updateResult = await collection.updateOne(
      {
        id: id.toString(),
        'meta.tag': {
          $not: {
            $elemMatch: {
              system: ALERT_TAG.system,
              code: ALERT_TAG.code,
            },
          },
        },
      },
      [
        {
          $set: {
            meta: {
              $mergeObjects: [
                { $ifNull: ['$meta', {}] },
                {
                  tag: {
                    $concatArrays: [
                      {
                        $cond: [
                          { $isArray: '$meta.tag' },
                          '$meta.tag',
                          [],
                        ],
                      },
                      [Object.assign({}, ALERT_TAG)],
                    ],
                  },
                  versionId,
                  lastUpdated,
                },
              ],
            },
          },
        },
      ]
    );

    const updatedObservation = await collection.findOne({ id: id.toString() });

    if (!updatedObservation) {
      return null;
    }

    if (updateResult.matchedCount === 0 && hasAlertTag(updatedObservation.meta && updatedObservation.meta.tag)) {
      return new Observation(sanitizeResourceDocument(updatedObservation));
    }

    if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
      throw buildAlertError(
        500,
        `Observation ${id} could not be marked as alert`,
        `Mongo update did not persist the alert tag for Observation/${id}.`
      );
    }

    if (!hasAlertTag(updatedObservation.meta && updatedObservation.meta.tag)) {
      throw buildAlertError(
        500,
        `Observation ${id} could not be marked as alert`,
        `Observation/${id} was updated but the alert tag is not present in meta.tag.`
      );
    }

    return new Observation(sanitizeResourceDocument(updatedObservation));
  } catch (err) {
    logger.error('Error with Observation.markAsAlert: ', err);
    if (Number.isInteger(err.code)) {
      throw err;
    }

    const handledError = handleError({ error: err, code: 500 });
    handledError.diagnostics = `${err.name}: ${err.message}`;
    throw handledError;
  }
};

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Observation >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Observation deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Observation >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Observation = getObservation(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);

    // Query our collection for this observation with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((observation) => {
      if (observation) {
        delete observation._id;
        resolve(new Observation(observation));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Observation >>> history');

    // Common search params
    let { base_version, _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let based_on = args['based_on'];
    let category = args['category'];
    let code = args['code'];
    let code_value_concept = args['code_value_concept'];
    let code_value_date = args['code_value_date'];
    let code_value_quantity = args['code_value_quantity'];
    let code_value_string = args['code_value_string'];
    let combo_code = args['combo_code'];
    let combo_code_value_concept = args['combo_code_value_concept'];
    let combo_code_value_quantity = args['combo_code_value_quantity'];
    let combo_data_absent_reason = args['combo_data_absent_reason'];
    let combo_value_concept = args['combo_value_concept'];
    let combo_value_quantity = args['combo_value_quantity'];
    let component_code = args['component_code'];
    let component_code_value_concept = args['component_code_value_concept'];
    let component_code_value_quantity = args['component_code_value_quantity'];
    let component_data_absent_reason = args['component_data_absent_reason'];
    let component_value_concept = args['component_value_concept'];
    let component_value_quantity = args['component_value_quantity'];
    let data_absent_reason = args['data_absent_reason'];
    let date = args['date'];
    let device = args['device'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let method = args['method'];
    let patient = args['patient'];
    let performer = args['performer'];
    let related = args['related'];
    let related_target = args['related_target'];
    let related_type = args['related_type'];
    let specimen = args['specimen'];
    let status = args['status'];
    let reference = args['reference'];
    let value_concept = args['value_concept'];
    let value_date = args['value_date'];
    let value_quantity = args['value_quantity'];
    let value_string = args['value_string'];

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
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);
    let Observation = getObservation(base_version);

    // Query our collection for observation history
    collection.find(query).toArray().then((observations) => {
      observations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Observation(element);
      });
      resolve(observations);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Observation >>> historyById');

    // Common search params
    let { base_version, _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
    let based_on = args['based_on'];
    let category = args['category'];
    let code = args['code'];
    let code_value_concept = args['code_value_concept'];
    let code_value_date = args['code_value_date'];
    let code_value_quantity = args['code_value_quantity'];
    let code_value_string = args['code_value_string'];
    let combo_code = args['combo_code'];
    let combo_code_value_concept = args['combo_code_value_concept'];
    let combo_code_value_quantity = args['combo_code_value_quantity'];
    let combo_data_absent_reason = args['combo_data_absent_reason'];
    let combo_value_concept = args['combo_value_concept'];
    let combo_value_quantity = args['combo_value_quantity'];
    let component_code = args['component_code'];
    let component_code_value_concept = args['component_code_value_concept'];
    let component_code_value_quantity = args['component_code_value_quantity'];
    let component_data_absent_reason = args['component_data_absent_reason'];
    let component_value_concept = args['component_value_concept'];
    let component_value_quantity = args['component_value_quantity'];
    let data_absent_reason = args['data_absent_reason'];
    let date = args['date'];
    let device = args['device'];
    let encounter = args['encounter'];
    let identifier = args['identifier'];
    let method = args['method'];
    let patient = args['patient'];
    let performer = args['performer'];
    let related = args['related'];
    let related_target = args['related_target'];
    let related_type = args['related_type'];
    let specimen = args['specimen'];
    let status = args['status'];
    let reference = args['reference'];
    let value_concept = args['value_concept'];
    let value_date = args['value_date'];
    let value_quantity = args['value_quantity'];
    let value_string = args['value_string'];

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
    let collection = db.collection(`${COLLECTION.OBSERVATION}_${base_version}`);
    let Observation = getObservation(base_version);

    // Query our collection for observation history by id
    collection.find(query).toArray().then((observations) => {
      observations.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Observation(element);
      });
      resolve(observations);
    }).catch(_reject);
  });
