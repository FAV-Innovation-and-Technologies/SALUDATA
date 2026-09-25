#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Lista de servicios que necesitan implementación
const servicesToImplement = [
    'account',
    'adverseevent',
    'activitydefinition',
    'allergyintolerance',
    'appointment',
    'appointmentresponse',
    'auditevent',
    'basic',
    'binary',
    'bodysite',
    'bundle',
    'capabilitystatement',
    'careplan',
    'careteam',
    'chargeitem',
    'claim',
    'claimresponse',
    'clinicalimpression',
    'codesystem',
    'communication',
    'communicationrequest',
    'compartmentdefinition',
    'composition',
    'conceptmap',
    'condition',
    'consent',
    'contract',
    'dataelement',
    'detectedissue',
    'device',
    'devicecomponent',
    'devicemetric',
    'devicerequest',
    'deviceusestatement',
    'diagnosticreport',
    'documentmanifest',
    'documentreference',
    'eligibilityrequest',
    'eligibilityresponse',
    'encounter',
    'endpoint',
    'enrollmentrequest',
    'enrollmentresponse',
    'episodeofcare',
    'expansionprofile',
    'explanationofbenefit',
    'familymemberhistory',
    'flag',
    'goal',
    'graphdefinition',
    'group',
    'guidanceresponse',
    'healthcareservice',
    'imagingmanifest',
    'imagingstudy',
    'immunization',
    'immunizationrecommendation',
    'implementationguide',
    'library',
    'linkage',
    'list',
    'location',
    'measure',
    'measurereport',
    'media',
    'medication',
    'medicationadministration',
    'medicationdispense',
    'medicationrequest',
    'medicationstatement',
    'messagedefinition',
    'messageheader',
    'namingsystem',
    'nutritionorder',
    'observation',
    'operationdefinition',
    'organization',
    'paymentnotice',
    'paymentreconciliation',
    'person',
    'plandefinition',
    'practitioner',
    'practitionerrole',
    'procedure',
    'procedurerequest',
    'processrequest',
    'processresponse',
    'provenance',
    'questionnaire',
    'questionnaireresponse',
    'referralrequest',
    'relatedperson',
    'requestgroup',
    'researchstudy',
    'researchsubject',
    'riskassessment',
    'schedule',
    'searchparameter',
    'sequence',
    'servicedefinition',
    'slot',
    'specimen',
    'structuredefinition',
    'structuremap',
    'subscription',
    'substance',
    'supplydelivery',
    'supplyrequest',
    'task',
    'testreport',
    'testscript',
    'valueset',
    'visionprescription'
];

// Plantilla base para los servicios
const serviceTemplate = (serviceName, serviceParams) => {
    const ServiceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    const COLLECTION_NAME = serviceName.toUpperCase();

    return `/*eslint no-unused-vars: "warn"*/

const { VERSIONS } = require('@bluehalo/node-fhir-server-core').constants;
const { resolveSchema } = require('@bluehalo/node-fhir-server-core');
const { COLLECTION, CLIENT_DB } = require('../../constants');
const moment = require('moment-timezone');
const globals = require('../../globals');
const jsonpatch = require('fast-json-patch');

const { handleError } = require('../../lib/mongo');
const { getUuid } = require('../../utils/uid.util');
const logger = require('@bluehalo/node-fhir-server-core').loggers.get();

const {
  stringQueryBuilder,
  tokenQueryBuilder,
  referenceQueryBuilder,
  dateQueryBuilder,
  quantityQueryBuilder,
} = require('../../utils/querybuilder.util');

let get${ServiceName} = (base_version) => {
  return resolveSchema(base_version, '${ServiceName}');
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

  // ${ServiceName} search params
${serviceParams.map(param => `  let ${param} = args['${param}'];`).join('\n')}

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

${serviceParams.map(param => {
        // Determinar el tipo de query builder basado en el nombre del parámetro
        if (param.includes('identifier')) {
            return `  if (${param}) {
    let queryBuilder = tokenQueryBuilder(${param}, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else if (param.includes('status') || param.includes('type') || param.includes('category')) {
            return `  if (${param}) {
    let queryBuilder = tokenQueryBuilder(${param}, 'code', '${param}.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else if (param.includes('date') || param.includes('period')) {
            return `  if (${param}) {
    let queryBuilder = dateQueryBuilder(${param}, 'date', '${param}');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else if (param.includes('subject') || param.includes('patient') || param.includes('practitioner') || param.includes('organization')) {
            return `  if (${param}) {
    let queryBuilder = referenceQueryBuilder(${param}, '${param}');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else {
            return `  if (${param}) {
    query.${param} = stringQueryBuilder(${param});
  }`;
        }
    }).join('\n\n')}

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

  // ${ServiceName} search params for DSTU2
${serviceParams.map(param => `  let ${param} = args['${param}'];`).join('\n')}

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

${serviceParams.map(param => {
        // Determinar el tipo de query builder basado en el nombre del parámetro
        if (param.includes('identifier')) {
            return `  if (${param}) {
    let queryBuilder = tokenQueryBuilder(${param}, 'value', 'identifier');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else if (param.includes('status') || param.includes('type') || param.includes('category')) {
            return `  if (${param}) {
    let queryBuilder = tokenQueryBuilder(${param}, 'code', '${param}.coding');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else if (param.includes('date') || param.includes('period')) {
            return `  if (${param}) {
    let queryBuilder = dateQueryBuilder(${param}, 'date', '${param}');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else if (param.includes('subject') || param.includes('patient') || param.includes('practitioner') || param.includes('organization')) {
            return `  if (${param}) {
    let queryBuilder = referenceQueryBuilder(${param}, '${param}');
    for (let i in queryBuilder) {
      query[i] = queryBuilder[i];
    }
  }`;
        } else {
            return `  if (${param}) {
    query.${param} = stringQueryBuilder(${param});
  }`;
        }
    }).join('\n\n')}

  if (ors.length !== 0) {
    query.$and = ors;
  }

  return query;
};

module.exports.search = async (args) => {
  logger.info('${ServiceName} >>> search');

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
  let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${base_version}\`);
  let ${ServiceName} = get${ServiceName}(base_version);

  try {
    // Query our collection for this ${serviceName}
    const cursor = collection.find(query);
    const ${serviceName}s = await cursor.toArray();

    ${serviceName}s.forEach(function (element, i, returnArray) {
      returnArray[i] = new ${ServiceName}(element);
    });

    return ${serviceName}s;
  } catch (err) {
    logger.error('Error with ${ServiceName}.search: ', err);
    throw handleError({ error: err });
  }
};

module.exports.searchById = async (args) => {
  logger.info('${ServiceName} >>> searchById');

  let { base_version, id } = args;
  let ${ServiceName} = get${ServiceName}(base_version);

  // Grab an instance of our DB and collection
  let db = globals.get(CLIENT_DB);
  let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${base_version}\`);

  try {
    // Query our collection for this ${serviceName}
    const ${serviceName} = await collection.findOne({ id: id.toString() });

    if (${serviceName}) {
      return new ${ServiceName}(${serviceName});
    }
    return null;
  } catch (err) {
    logger.error('Error with ${ServiceName}.searchById: ', err);
    throw handleError({ error: err });
  }
};

module.exports.create = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('${ServiceName} >>> create');

    let resource = req.body;

    let { base_version } = args;

    // Grab an instance of our DB and collection (by version)
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${base_version}\`);

    // Get current record
    let ${ServiceName} = get${ServiceName}(base_version);
    let ${serviceName} = new ${ServiceName}(resource);

    // If no resource ID was provided, generate one.
    let id = getUuid(${serviceName});

    // Create the resource's metadata
    let Meta = getMeta(base_version);
    ${serviceName}.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    collection.insertOne(${serviceName}).then((result) => {
      logger.info('${ServiceName} created with id: ' + id);
      resolve({ id });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, reject) => {
    logger.info('${ServiceName} >>> update');

    let { base_version, id } = args;
    let resource = req.body;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${base_version}\`);

    // Get current record
    let ${ServiceName} = get${ServiceName}(base_version);
    let Meta = getMeta(base_version);

    // Cast resource to ${ServiceName} Class
    let ${serviceName} = new ${ServiceName}(resource);
    ${serviceName}.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    });

    // Save the resource to the database
    collection.updateOne({ id: id.toString() }, { $set: ${serviceName} }).then((result) => {
      logger.info('${ServiceName} updated with id: ' + id);
      resolve({
        id: ${serviceName}.id,
        created: false,
        resource_version: ${serviceName}.meta.versionId,
      });
    });
  });

module.exports.remove = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('${ServiceName} >>> remove');

    let { id } = args;

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${args.base_version}\`);

    // Delete the record from the database
    collection.deleteOne({ id: id.toString() }).then((result) => {
      logger.info('${ServiceName} deleted with id: ' + id);
      resolve({ deleted: result.deletedCount });
    });
  });

module.exports.searchByVersionId = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('${ServiceName} >>> searchByVersionId');

    let { base_version, id, version_id } = args;

    let ${ServiceName} = get${ServiceName}(base_version);

    // Grab an instance of our DB and collection
    let db = globals.get(CLIENT_DB);
    let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${base_version}\`);

    // Query our collection for this ${serviceName} with specific version
    collection.findOne({ id: id.toString(), 'meta.versionId': version_id }).then((${serviceName}) => {
      if (${serviceName}) {
        resolve(new ${ServiceName}(${serviceName}));
      } else {
        resolve(null);
      }
    });
  });

module.exports.history = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('${ServiceName} >>> history');

    // Common search params
    let { base_version, _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
${serviceParams.map(param => `    let ${param} = args['${param}'];`).join('\n')}

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
    let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${base_version}\`);
    let ${ServiceName} = get${ServiceName}(base_version);

    // Query our collection for ${serviceName} history
    collection.find(query).toArray().then((${serviceName}s) => {
      ${serviceName}s.forEach(function (element, i, returnArray) {
        returnArray[i] = new ${ServiceName}(element);
      });
      resolve(${serviceName}s);
    });
  });

module.exports.historyById = (args, context) =>
  new Promise((resolve, reject) => {
    logger.info('${ServiceName} >>> historyById');

    // Common search params
    let { base_version, _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
${serviceParams.map(param => `    let ${param} = args['${param}'];`).join('\n')}

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
    let collection = db.collection(\`\${COLLECTION.${COLLECTION_NAME}}_\${base_version}\`);
    let ${ServiceName} = get${ServiceName}(base_version);

    // Query our collection for ${serviceName} history by id
    collection.find(query).toArray().then((${serviceName}s) => {
      ${serviceName}s.forEach(function (element, i, returnArray) {
        returnArray[i] = new ${ServiceName}(element);
      });
      resolve(${serviceName}s);
    });
  });
`;
};

// Función para extraer parámetros de búsqueda de un archivo de servicio
function extractSearchParams(servicePath) {
    try {
        const content = fs.readFileSync(servicePath, 'utf8');
        const lines = content.split('\n');
        const params = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('let ') && line.includes('= args[') && !line.includes('base_version')) {
                const param = line.match(/let (\w+) = args\[/)?.[1];
                if (param && !param.startsWith('_')) {
                    params.push(param);
                }
            }
        }

        return params;
    } catch (error) {
        console.error(`Error reading ${servicePath}:`, error.message);
        return [];
    }
}

// Función principal
function implementServices() {
    console.log('🚀 Iniciando implementación de servicios FHIR...\n');

    let implementedCount = 0;
    let skippedCount = 0;

    for (const serviceName of servicesToImplement) {
        const servicePath = path.join(__dirname, '..', 'src', 'services', serviceName, `${serviceName}.service.js`);

        if (!fs.existsSync(servicePath)) {
            console.log(`⚠️  Servicio ${serviceName} no encontrado, saltando...`);
            skippedCount++;
            continue;
        }

        // Verificar si el servicio ya está implementado
        const content = fs.readFileSync(servicePath, 'utf8');
        if (!content.includes('TODO: Build query from Parameters')) {
            console.log(`✅ Servicio ${serviceName} ya implementado, saltando...`);
            skippedCount++;
            continue;
        }

        // Extraer parámetros de búsqueda
        const searchParams = extractSearchParams(servicePath);

        if (searchParams.length === 0) {
            console.log(`⚠️  No se pudieron extraer parámetros para ${serviceName}, usando parámetros básicos...`);
            searchParams.push('identifier', 'status', 'type');
        }

        // Generar implementación
        const implementation = serviceTemplate(serviceName, searchParams);

        // Crear backup del archivo original
        const backupPath = `${servicePath}.backup`;
        fs.writeFileSync(backupPath, content);

        // Escribir nueva implementación
        fs.writeFileSync(servicePath, implementation);

        console.log(`✅ Implementado servicio ${serviceName} con ${searchParams.length} parámetros de búsqueda`);
        implementedCount++;
    }

    console.log(`\n🎉 Implementación completada!`);
    console.log(`📊 Resumen:`);
    console.log(`   - Servicios implementados: ${implementedCount}`);
    console.log(`   - Servicios saltados: ${skippedCount}`);
    console.log(`   - Total procesados: ${implementedCount + skippedCount}`);
    console.log(`\n💡 Los archivos originales se han respaldado con extensión .backup`);
}

// Ejecutar el script
if (require.main === module) {
    implementServices();
}

module.exports = { implementServices, serviceTemplate }; 