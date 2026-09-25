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
  nameQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  dateQueryBuilder,
  quantityQueryBuilder,
} = require('../../utils/querybuilder.util');

let addEmailQuery = (ors, email) => {
  const valueQuery = stringQueryBuilder(email);
  ors.push({
    $or: [
      { email: valueQuery },
      {
        telecom: {
          $elemMatch: {
            system: 'email',
            value: valueQuery,
          },
        },
      },
    ],
  });
};

let addTelecomQuery = (ors, telecom) => {
  const valueQuery = stringQueryBuilder(telecom);
  ors.push({
    $or: [
      { 'telecom.value': valueQuery },
      {
        telecom: {
          $elemMatch: {
            value: valueQuery,
          },
        },
      },
    ],
  });
};

let getPatient = (base_version) => {
  return resolveSchema(base_version, 'Patient');
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

  // Patient search params
  let active = args['active'];
  let address = args['address'];
  let address_city = args['address_city'];
  let address_country = args['address_country'];
  let address_postalcode = args['address_postalcode'];
  let address_state = args['address_state'];
  let address_use = args['address_use'];
  let animal_breed = args['animal_breed'];
  let animal_species = args['animal_species'];
  let birthdate = args['birthdate'];
  let death_date = args['death_date'];
  let deceased = args['deceased'];
  let email = args['email'];
  let family = args['family'];
  let gender = args['gender'];
  let general_practitioner = args['general_practitioner'];
  let given = args['given'];
  let identifier = args['identifier'];
  let language = args['language'];
  let link = args['link'];
  let name = args['name'];
  let organization = args['organization'];
  let phone = args['phone'];
  let phonetic = args['phonetic'];
  let telecom = args['telecom'];
  let careprovider = args['careprovider'];

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

  if (animal_breed) {
    query.animal_breed = stringQueryBuilder(animal_breed);
  }

  if (animal_species) {
    query.animal_species = stringQueryBuilder(animal_species);
  }

  if (birthdate) {
    let queryBuilder = dateQueryBuilder(birthdate, 'date', 'birthdate');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (death_date) {
    let queryBuilder = dateQueryBuilder(death_date, 'date', 'death_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (deceased) {
    query.deceased = stringQueryBuilder(deceased);
  }

  if (email) {
    addEmailQuery(ors, email);
  }

  if (family) {
    query['name.family'] = stringQueryBuilder(family);
  }

  if (gender) {
    query.gender = stringQueryBuilder(gender);
  }

  if (general_practitioner) {
    let queryBuilder = referenceQueryBuilder(general_practitioner, 'general_practitioner');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (given) {
    query['name.given'] = stringQueryBuilder(given);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (language) {
    query.language = stringQueryBuilder(language);
  }

  if (link) {
    query.link = stringQueryBuilder(link);
  }

  if (name) {
    ors.push(...nameQueryBuilder(name));
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

  if (phonetic) {
    query.phonetic = stringQueryBuilder(phonetic);
  }

  if (telecom) {
    addTelecomQuery(ors, telecom);
  }

  if (careprovider) {
    query.careprovider = stringQueryBuilder(careprovider);
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

  // Patient search params for DSTU2
  let active = args['active'];
  let address = args['address'];
  let address_city = args['address_city'];
  let address_country = args['address_country'];
  let address_postalcode = args['address_postalcode'];
  let address_state = args['address_state'];
  let address_use = args['address_use'];
  let animal_breed = args['animal_breed'];
  let animal_species = args['animal_species'];
  let birthdate = args['birthdate'];
  let death_date = args['death_date'];
  let deceased = args['deceased'];
  let email = args['email'];
  let family = args['family'];
  let gender = args['gender'];
  let general_practitioner = args['general_practitioner'];
  let given = args['given'];
  let identifier = args['identifier'];
  let language = args['language'];
  let link = args['link'];
  let name = args['name'];
  let organization = args['organization'];
  let phone = args['phone'];
  let phonetic = args['phonetic'];
  let telecom = args['telecom'];
  let careprovider = args['careprovider'];

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

  if (animal_breed) {
    query.animal_breed = stringQueryBuilder(animal_breed);
  }

  if (animal_species) {
    query.animal_species = stringQueryBuilder(animal_species);
  }

  if (birthdate) {
    let queryBuilder = dateQueryBuilder(birthdate, 'date', 'birthdate');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (death_date) {
    let queryBuilder = dateQueryBuilder(death_date, 'date', 'death_date');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (deceased) {
    query.deceased = stringQueryBuilder(deceased);
  }

  if (email) {
    addEmailQuery(ors, email);
  }

  if (family) {
    query['name.family'] = stringQueryBuilder(family);
  }

  if (gender) {
    query.gender = stringQueryBuilder(gender);
  }

  if (general_practitioner) {
    let queryBuilder = referenceQueryBuilder(general_practitioner, 'general_practitioner');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (given) {
    query['name.given'] = stringQueryBuilder(given);
  }

  if (identifier) {
    let queryBuilder = tokenQueryBuilder(identifier, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }

  if (language) {
    query.language = stringQueryBuilder(language);
  }

  if (link) {
    query.link = stringQueryBuilder(link);
  }

  if (name) {
    ors.push(...nameQueryBuilder(name));
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

  if (phonetic) {
    query.phonetic = stringQueryBuilder(phonetic);
  }

  if (telecom) {
    addTelecomQuery(ors, telecom);
  }

  if (careprovider) {
    query.careprovider = stringQueryBuilder(careprovider);
  }

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('Patient >>> search');

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
  let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);
  let Patient = getPatient(base_version);

  try {
    // Query our collection for this patient
    const cursor = collection.find(query);
    const patients = await cursor.toArray();

    patients.forEach(function (element, i, returnArray) {
      delete element._id;
      returnArray[i] = new Patient(element);
    });

    return toSearchBundle(patients);
  } catch (err) {
    logger.error('Error with Patient.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('Patient >>> searchById');

  let { base_version, id } = args;
  let Patient = getPatient(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);

  try {
    // Query our collection for this patient
    const patient = await collection.findOne({ id: id.toString() });

    if (patient) {
      delete patient._id;
      return new Patient(patient);
    }
    return null;
  } catch (err) {
    logger.error('Error with Patient.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Patient >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);

    // Get current record
    let Patient = getPatient(base_version);
    let patient = new Patient(resource);
    delete patient._id;

    // If no resource ID was provided, generate one and assign it to the resource
    let id = patient.id || getUuid();
    if (!patient.id) {
      patient.id = id;
    }

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    patient.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    // Convert to plain object to prevent MongoDB from persisting internal _id Binary
    let doc = JSON.parse(JSON.stringify(patient));
    if (doc._id) {
      delete doc._id;
    }
    collection.insertOne(doc).then((_result) => {
      logger.info('Patient created with id: ' + id);
      // Return the resource with id
      resolve(Object.assign({}, doc, { id: id }));
    }).catch(_reject);
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
    logger.info('Patient >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);

    // Get current record
    let Patient = getPatient(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to Patient Class
    let patient = new Patient(resource);
    delete patient._id;
    patient.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    let doc = JSON.parse(JSON.stringify(patient));
    delete doc._id;
    collection.updateOne({ id: id.toString() }, { $set: doc }).then((_result) => {
      logger.info('Patient updated with id: ' + id);
      resolve({
        id: patient.id,
        created: false,
        resource_version: patient.meta.versionId,
      });
    }).catch(_reject);
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Patient >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${args.base_version}`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('Patient deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    }).catch(_reject);
  });

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Patient >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let Patient = getPatient(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);

    // Query our collection for this patient with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((patient) => {
      if (patient) {
        delete patient._id;
        resolve(new Patient(patient));
      } else {
        resolve(null);
      }
    }).catch(_reject);
  });

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Patient >>> history');

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
    let animal_breed = args['animal_breed'];
    let animal_species = args['animal_species'];
    let birthdate = args['birthdate'];
    let death_date = args['death_date'];
    let deceased = args['deceased'];
    let email = args['email'];
    let family = args['family'];
    let gender = args['gender'];
    let general_practitioner = args['general_practitioner'];
    let given = args['given'];
    let identifier = args['identifier'];
    let language = args['language'];
    let link = args['link'];
    let name = args['name'];
    let organization = args['organization'];
    let phone = args['phone'];
    let phonetic = args['phonetic'];
    let telecom = args['telecom'];
    let careprovider = args['careprovider'];

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
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);
    let Patient = getPatient(base_version);

    // Query our collection for patient history
    collection.find(query).toArray().then((patients) => {
      patients.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Patient(element);
      });
      resolve(patients);
    }).catch(_reject);
  });

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('Patient >>> historyById');

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
    let animal_breed = args['animal_breed'];
    let animal_species = args['animal_species'];
    let birthdate = args['birthdate'];
    let death_date = args['death_date'];
    let deceased = args['deceased'];
    let email = args['email'];
    let family = args['family'];
    let gender = args['gender'];
    let general_practitioner = args['general_practitioner'];
    let given = args['given'];
    let identifier = args['identifier'];
    let language = args['language'];
    let link = args['link'];
    let name = args['name'];
    let organization = args['organization'];
    let phone = args['phone'];
    let phonetic = args['phonetic'];
    let telecom = args['telecom'];
    let careprovider = args['careprovider'];

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
    let collection = db.collection(`${COLLECTION.PATIENT}_${base_version}`);
    let Patient = getPatient(base_version);

    // Query our collection for patient history by id
    collection.find(query).toArray().then((patients) => {
      patients.forEach(function (element, i, returnArray) {
        delete element._id;
        returnArray[i] = new Patient(element);
      });
      resolve(patients);
    }).catch(_reject);
  });
