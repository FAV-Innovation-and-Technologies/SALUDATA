#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Función para arreglar problemas en un archivo de servicio
function fixServiceIssues(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Extraer parámetros de búsqueda del archivo original
        const lines = content.split('\n');
        const searchParams = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const varMatch = line.match(/^let (\w+) = args\[/);
            if (varMatch) {
                const varName = varMatch[1];
                if (!varName.startsWith('_') && !searchParams.includes(varName)) {
                    searchParams.push(varName);
                }
            }
        }

        if (searchParams.length === 0) {
            console.log(`⚠️  No se pudieron extraer parámetros para ${path.basename(filePath)}`);
            return false;
        }

        // Generar nueva implementación con los parámetros correctos
        const serviceName = path.basename(filePath, '.service.js');
        const ServiceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
        const COLLECTION_NAME = serviceName.toUpperCase();

        const newContent = `/*eslint no-unused-vars: "warn"*/

const { VERSIONS } = require('@bluehalo/node-fhir-server-core').constants;
const { resolveSchema } = require('@bluehalo/node-fhir-server-core');
const { COLLECTION, CLIENT_DB } = require('../../constants');
const moment = require('moment-timezone');
const globals = require('../../globals');

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
${searchParams.map(param => `  let ${param} = args['${param}'];`).join('\n')}

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

${searchParams.map(param => {
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
${searchParams.map(param => `  let ${param} = args['${param}'];`).join('\n')}

  let query = {};
  let ors = [];

  if (_id) {
    query.id = _id;
  }

${searchParams.map(param => {
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
  new Promise((resolve, _reject) => {
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
    collection.insertOne(${serviceName}).then((_result) => {
      logger.info('${ServiceName} created with id: ' + id);
      resolve({ id });
    });
  });

module.exports.update = (args, { req }) =>
  new Promise((resolve, _reject) => {
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
    collection.updateOne({ id: id.toString() }, { $set: ${serviceName} }).then((_result) => {
      logger.info('${ServiceName} updated with id: ' + id);
      resolve({
        id: ${serviceName}.id,
        created: false,
        resource_version: ${serviceName}.meta.versionId,
      });
    });
  });

module.exports.remove = (args, _context) =>
  new Promise((resolve, _reject) => {
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

module.exports.searchByVersionId = (args, _context) =>
  new Promise((resolve, _reject) => {
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

module.exports.history = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('${ServiceName} >>> history');

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
${searchParams.map(param => `    let ${param} = args['${param}'];`).join('\n')}

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

module.exports.historyById = (args, _context) =>
  new Promise((resolve, _reject) => {
    logger.info('${ServiceName} >>> historyById');

    // Common search params
    let { _content, _format, _id, _lastUpdated, _profile, _query, _security, _tag } =
      args;

    // Search Result params
    let { _INCLUDE, _REVINCLUDE, _SORT, _COUNT, _SUMMARY, _ELEMENTS, _CONTAINED, _CONTAINEDTYPED } =
      args;

    // Resource Specific params
${searchParams.map(param => `    let ${param} = args['${param}'];`).join('\n')}

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

        fs.writeFileSync(filePath, newContent);
        return true;
    } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
        return false;
    }
}

// Función para procesar todos los servicios
function fixAllServices() {
    console.log('🔧 Iniciando arreglo de servicios FHIR...\n');

    const servicesDir = path.join(__dirname, '..', 'src', 'services');
    const services = fs.readdirSync(servicesDir);

    let fixedCount = 0;
    let errorCount = 0;

    for (const service of services) {
        const servicePath = path.join(servicesDir, service, `${service}.service.js`);

        if (fs.existsSync(servicePath)) {
            if (fixServiceIssues(servicePath)) {
                console.log(`✅ Arreglado servicio ${service}`);
                fixedCount++;
            } else {
                console.log(`❌ Error arreglando servicio ${service}`);
                errorCount++;
            }
        }
    }

    console.log(`\n🎉 Arreglo completado!`);
    console.log(`📊 Resumen:`);
    console.log(`   - Servicios arreglados: ${fixedCount}`);
    console.log(`   - Errores: ${errorCount}`);
}

// Ejecutar el script
if (require.main === module) {
    fixAllServices();
}

module.exports = { fixServiceIssues, fixAllServices }; 