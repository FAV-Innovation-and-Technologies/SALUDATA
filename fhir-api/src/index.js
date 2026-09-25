// Cargar variables de entorno desde .env
require('dotenv').config();

const { Server } = require('@bluehalo/node-fhir-server-core');
const logger = require('@bluehalo/node-fhir-server-core').loggers.get();
const asyncHandler = require('./lib/async-handler');
const { connect: mongoClient } = require('./lib/mongo');
const globals = require('./globals');

const { upload, processBundleUpload } = require('./routes/bundle-upload');
const {
  attachSportsRealtimeWebSocket,
  registerSportsEcgIngestion
} = require('./routes/sports-ecg-ingestion');
const { registerMeasurementIngestion } = require('./routes/measurement-ingestion');
const {
  createFhirObservationShadowAdapter,
} = require('./routes/fhir-observation-shadow-adapter');
const { serve, setup } = require('./swagger');
const KafkaManager = require('./lib/kafka-manager');
const {
  createLegacyEndpointAccess,
} = require('./middleware/legacy-endpoint-access');
const observationService = require('./services/observation/observation.service');

const {
  fhirServerConfig,
  mongoConfig,
  kafkaConfig,
  legacyEndpointConfig,
} = require('./config');

const { CLIENT, CLIENT_DB } = require('./constants');
const KAFKA_MANAGER = 'KAFKA_MANAGER';

let main = async function () {
  // Kafka connection using config.js (only if enabled)
  if (kafkaConfig.enabled) {
    const kafkaManager = new KafkaManager(kafkaConfig);
    try {
      await kafkaManager.connect();
      globals.set(KAFKA_MANAGER, kafkaManager);
      logger.info('KafkaManager connected and available globally.');
    } catch (kafkaErr) {
      console.error('Kafka connection error:', kafkaErr.message);
      process.exit(1);
    }
  } else {
    logger.info('KafkaManager is disabled by configuration.');
  }
  // Connect to MongoDB and pass any options here
  let [mongoErr, client] = await asyncHandler(
    mongoClient(mongoConfig.connection, mongoConfig.options)
  );

  if (mongoErr) {
    logger.error('MongoDB connection failed. Connection details were redacted.');
    process.exit(1);
  }

  // Save the client in another module so it can be used in services
  globals.set(CLIENT, client);
  globals.set(CLIENT_DB, client.db(mongoConfig.db_name));

  // Create Server instance for direct access to Express
  let server = new Server(fhirServerConfig);
  const authStrategy = fhirServerConfig.auth && fhirServerConfig.auth.strategy;
  const legacyEndpointAccess = createLegacyEndpointAccess({
    authEnabled: Boolean(authStrategy),
    endpointsEnabled: legacyEndpointConfig.enabled,
    strategyName: authStrategy && authStrategy.name,
    logger,
  });

  // Configure the explicit allowlist from config; unknown origins fail closed.
  const cors = require('cors');
  server.app.use(cors({
    ...fhirServerConfig.server.corsOptions,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Idempotency-Key',
      'X-Requested-With',
      'X-Plan-Id',
      'X-Saludata-User-Id',
      'X-Saludata-Athlete-Id',
      'X-Saludata-User-Provider',
      'X-Chunk-Name',
      'X-Chunk-Kind',
      'X-Chunk-Sha256',
      'X-Source',
      'X-Device-Mode',
      'X-Analysis-Mode',
    ],
    exposedHeaders: ['Content-Type', 'Location', 'ETag']
  }));

  // Add body parsers before Kafka middleware
  const express = require('express');
  server.app.use(
    express.json({
      type: ['application/json', 'application/fhir+json'],
      limit: '10mb',
    })
  );
  server.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  registerMeasurementIngestion({
    app: server.app,
    db: client.db(mongoConfig.db_name),
    kafkaManager: globals.get(KAFKA_MANAGER),
    logger
  });
  logger.info('Shadow monitoring ingestion endpoint enabled: POST /v1/measurement-batches');

  const fhirObservationShadowAdapter = createFhirObservationShadowAdapter({
    db: client.db(mongoConfig.db_name),
    kafkaManager: globals.get(KAFKA_MANAGER),
    logger,
  });
  server.app.use(fhirObservationShadowAdapter.middleware);
  logger.info('FHIR heart-rate and weight shadow projection enabled.');

  registerSportsEcgIngestion({
    app: server.app,
    express,
    db: client.db(mongoConfig.db_name),
    kafkaManager: globals.get(KAFKA_MANAGER),
    logger
  });
  logger.info('Sports ECG ingestion endpoints enabled.');

  // ---------------- Alerts Hook (PlanDefinition/$apply via cqf-ruler) ----------------
  const CQF_BASE = process.env.CQF_BASE || 'http://localhost:8080/fhir';

  // Mapeo base: LOINC code -> PlanDefinition ID (cuando no importa el dispositivo)
  const PLAN_MAP = {
    '85354-9': 'blood-pressure-alert',
    '39156-5': 'bmi-alert',
    '8310-5': 'body-temperature-alert',
    '8867-4': 'heart-rate-alert',
    '59408-5': 'oxygen-saturation-alert',
    '9279-1': 'respiratory-rate-alert'
  };

  // Mapeo específico por dispositivo: LOINC + Device Identifier -> PlanDefinition ID
  // Formato: 'LOINC|DEVICE_IDENTIFIER' -> 'plan-definition-id'
  // NOTA: Si existe un mapeo aquí, tiene prioridad sobre PLAN_MAP
  // Si no existe mapeo específico, se usa el PLAN_MAP general
  const DEVICE_PLAN_MAP = {
    // BP7 - Tensiometro (presión arterial)
    '85354-9|bp7': 'bp7-measurement',

    // HS2S Pro - Báscula (BMI)
    '39156-5|hs2s-pro': 'hs2s-pro-measurement',

    // Cosinuss Two - Dispositivo auricular multiparámetro
    '8310-5|cosinuss-two': 'cosinuss-two-measurement', // Temperatura
    '8867-4|cosinuss-two': 'cosinuss-two-measurement', // Frecuencia cardiaca
    '59408-5|cosinuss-two': 'cosinuss-two-measurement', // Saturación de oxígeno
    '9279-1|cosinuss-two': 'cosinuss-two-measurement', // Frecuencia respiratoria
  };


  async function httpJson(url, options) {
    const resp = await fetch(url, options);
    const ct = resp.headers.get('content-type') || '';
    let body = ct.includes('json') ? await resp.json() : await resp.text();
    // Tolerar servidores que no establecen content-type json pero devuelven JSON
    if (typeof body === 'string') {
      const trimmed = body.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { body = JSON.parse(trimmed); } catch (e) { /* ignore parse errors */ } // eslint-disable-line no-unused-vars
      }
    }
    if (!resp.ok) {
      const msg = typeof body === 'string' ? body : JSON.stringify(body);
      const method = (options && options.method) || 'GET';
      throw new Error(`${method} ${url} -> ${resp.status} ${msg}`);
    }
    // Extraer id de la respuesta POST/PUT
    const method = (options && options.method) || 'GET';
    if ((method === 'POST' || method === 'PUT') && typeof body === 'object') {
      // Si el body ya tiene id, devolverlo tal cual
      if (body.id) {
        return body;
      }
      // Si es OperationOutcome, probablemente es del endpoint /alerts-hook, no del recurso creado
      if (body.resourceType === 'OperationOutcome') {
        logger.info('[httpJson] POST/PUT devolvió OperationOutcome, no el recurso creado');
        return body;
      }
      // Intentar extraer del Location header
      const location = resp.headers.get('location');
      if (location) {
        const match = location.match(/\/([^/]+)$/);
        if (match && match[1]) {
          body.id = match[1];
          logger.info('[httpJson] Resource identifier obtained from Location header.');
          return body;
        }
      }
      logger.info('[httpJson] POST/PUT response did not include a resource identifier.');
    }
    return body;
  }

  async function fhirGet(base, path) {
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    return httpJson(url, { method: 'GET', headers: { 'Accept': 'application/fhir+json' } });
  }

  async function fhirPost(base, path, payload) {
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    return httpJson(url, { method: 'POST', headers: { 'Content-Type': 'application/fhir+json' }, body: JSON.stringify(payload) });
  }

  async function fhirPut(base, path, payload) {
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    return httpJson(url, { method: 'PUT', headers: { 'Content-Type': 'application/fhir+json' }, body: JSON.stringify(payload) });
  }

  function buildLocalFhirBase() {
    const port = fhirServerConfig.server.port;
    return `http://localhost:${port}/4_0_0`;
  }

  function buildOperationOutcome(code, message, options = {}) {
    const { diagnostics = message, expression = null, severity = 'error' } = options;
    const issue = {
      severity,
      code,
      details: { text: message },
      diagnostics,
    };

    if (Array.isArray(expression) && expression.length > 0) {
      issue.expression = expression;
    }

    return {
      resourceType: 'OperationOutcome',
      issue: [issue],
    };
  }

  function resolvePlanIdsFromObservation(req, observation) {
    // Header or path override first
    const hdr = req.get('X-Plan-Id');
    if (hdr && String(hdr).trim()) { return [String(hdr).trim()]; }

    try {
      // Extraer código LOINC
      const codings = (observation && observation.code && Array.isArray(observation.code.coding)) ? observation.code.coding : [];
      const loinc = (codings.find(c => c.system === 'http://loinc.org' && c.code) || {}).code || null;

      if (!loinc) {
        return [];
      }

      // Extraer identificador del dispositivo (si existe)
      let deviceId = null;
      if (observation.device) {
        // Caso 1: device.reference (ej: "Device/cosinuss-two")
        if (observation.device.reference) {
          const refMatch = observation.device.reference.match(/Device\/(.+)$/);
          if (refMatch && refMatch[1]) {
            deviceId = refMatch[1];
          }
        }
        // Caso 2: device.identifier (ej: { system: "urn:saludata:devices", value: "TENS-001" })
        else if (observation.device.identifier && observation.device.identifier.value) {
          deviceId = observation.device.identifier.value;
        }
      }

      // Intentar mapeo específico por dispositivo primero (si existe dispositivo)
      if (deviceId) {
        const deviceKey = `${loinc}|${deviceId}`;
        if (DEVICE_PLAN_MAP[deviceKey]) {
          const mapped = DEVICE_PLAN_MAP[deviceKey];
          return Array.isArray(mapped) ? mapped : [mapped];
        }
      }

      // Fallback al mapeo general por LOINC
      if (PLAN_MAP[loinc]) {
        const mapped = PLAN_MAP[loinc];
        return Array.isArray(mapped) ? mapped : [mapped];
      }
    } catch (e) { /* ignore errors */ } // eslint-disable-line no-unused-vars

    return [];
  }

  // Auto-forward device POSTs of Observation or Bundle to /alerts-hook (fire-and-forget)
  server.app.use(async (req, _res, next) => {
    try {
      const isObservationEndpoint = /\/4_0_0\/Observation\/?(\?|$)/.test(req.originalUrl) &&
        req.body &&
        req.body.resourceType === 'Observation';
      const isBundleEndpointBase = /\/4_0_0\/?(\?|$)/.test(req.originalUrl) && req.body && req.body.resourceType === 'Bundle';
      const isBundleResourceEndpoint = /\/4_0_0\/Bundle(\b|\/|\?|$)/.test(req.originalUrl) && req.body && req.body.resourceType === 'Bundle';

      // Detectar si es un Bundle transaction/batch que debe procesarse
      const isTransactionBundle = req.body && req.body.resourceType === 'Bundle' &&
        (req.body.type === 'transaction' || req.body.type === 'batch');

      if (
        legacyEndpointConfig.enabled &&
        req.method === 'POST' &&
        (isObservationEndpoint ||
          isBundleEndpointBase ||
          (isBundleResourceEndpoint && isTransactionBundle))
      ) {
        const hookUrl = `http://localhost:${fhirServerConfig.server.port}/alerts-hook`;
        const authorization = req.get('Authorization');
        const hookHeaders = { 'Content-Type': 'application/fhir+json' };
        if (authorization) {
          hookHeaders.Authorization = authorization;
        }
        // Fire-and-forget; do not block the CRUD handler
        Promise.resolve()
          .then(() =>
            httpJson(hookUrl, {
              method: 'POST',
              headers: hookHeaders,
              body: JSON.stringify(req.body || {}),
            })
          )
          .catch(() => {});
      }
    } catch (e) { /* ignore errors */ } // eslint-disable-line no-unused-vars
    next();
  });

  // Procesar Bundle transaction/batch y guardar cada recurso en MongoDB
  server.app.use(async (req, res, next) => {
    try {
      // Solo procesar POST al endpoint base o /Bundle con Bundle transaction/batch
      // Coincide con: /4_0_0, /4_0_0/, /4_0_0/Bundle, /4_0_0/Bundle/, etc.
      const urlMatches = /\/4_0_0(\/Bundle)?\/?(\?|$)/.test(req.originalUrl);
      const isBundleTransactionEndpoint = req.method === 'POST' &&
        urlMatches &&
        req.body &&
        req.body.resourceType === 'Bundle' &&
        (req.body.type === 'transaction' || req.body.type === 'batch') &&
        Array.isArray(req.body.entry);

      // Log para depuración
      if (req.method === 'POST' && req.body && req.body.resourceType === 'Bundle') {
        logger.info(
          `Bundle Middleware >>> Request inspected type=${req.body.type || 'unknown'} entries=${Array.isArray(req.body.entry) ? req.body.entry.length : 0} matched=${isBundleTransactionEndpoint}`
        );
      }

      if (isBundleTransactionEndpoint) {
        const db = globals.get(CLIENT_DB);
        const baseVersion = '4_0_0';
        const bundle = req.body;
        const results = { processed: 0, errors: 0, details: [] };

        logger.info(`Bundle Transaction >>> Procesando ${bundle.entry.length} recursos del Bundle`);

        // Procesar cada entrada del bundle
        for (let i = 0; i < bundle.entry.length; i++) {
          const entry = bundle.entry[i];
          if (!entry.resource) { continue; }

          const resource = entry.resource;
          const resourceType = resource.resourceType;

          if (!resourceType) {
            results.errors++;
            results.details.push(`Entrada ${i + 1}: Sin resourceType`);
            continue;
          }

          try {
            // Determinar el método HTTP de la entrada
            const method = (entry.request && entry.request.method) || 'POST';

            // Solo procesar POST y PUT (crear/actualizar)
            if (method !== 'POST' && method !== 'PUT') {
              logger.info(`Bundle Transaction >>> Saltando entrada ${i + 1}: método ${method} no soportado`);
              continue;
            }

            // Crear colecciones para el recurso y su historial
            const collectionName = `${resourceType}_${baseVersion}`;
            const historyCollectionName = `${resourceType}_${baseVersion}_History`;

            const collection = db.collection(collectionName);
            const historyCollection = db.collection(historyCollectionName);

            // Asegurar que el recurso tenga un id
            //
            // Para Observation provenientes de dispositivos, queremos que cada medición
            // sea un recurso distinto, incluso si el bundle trae un id fijo
            // (por ejemplo, "heart-rate-cosinuss-two"). Por eso, para POST de
            // Observation siempre generamos un nuevo id único.
            if (resourceType === 'Observation' && method === 'POST') {
              const uuid = require('./utils/uid.util').getUuid(resource);
              resource.id = uuid;
            } else {
              if (!resource.id && entry.fullUrl) {
                // Intentar extraer id del fullUrl
                const match = entry.fullUrl.match(/[^:]+:([^/]+)$/);
                if (match) {
                  resource.id = match[1];
                }
              }

              // Si aún no tiene id, generar uno (usando el servicio correspondiente si está disponible)
              if (!resource.id) {
                const uuid = require('./utils/uid.util').getUuid(resource);
                resource.id = uuid;
              }
            }

            // Preparar el documento para insertar
            // Eliminar _id si existe para que MongoDB lo genere automáticamente
            const doc = Object.assign({}, resource);
            if (doc._id) {
              delete doc._id;
            }

            // Insertar/actualizar en la colección principal
            await collection.updateOne(
              { id: resource.id },
              { $set: doc },
              { upsert: true }
            );

            // Insertar en el historial
            await historyCollection.updateOne(
              { id: resource.id },
              { $set: doc },
              { upsert: true }
            );

            // Publicar en Kafka si está habilitado y el recurso está en la lista de endpoints
            // NOTA: Patient solo se publica cuando se hace POST directo a /4_0_0/Patient,
            // no cuando viene dentro de un Bundle transaction
            const normalizedEndpoints = kafkaConfig.endpoints.map(e => e.replace(/^\/+/, '').toLowerCase());
            const resourceTypeLower = resourceType.toLowerCase();
            const shouldPublishToKafka = kafkaConfig.enabled &&
              Array.isArray(kafkaConfig.endpoints) &&
              normalizedEndpoints.includes(resourceTypeLower) &&
              method === 'POST' &&
              resourceTypeLower !== 'patient'; // Excluir Patient de bundles

            // Logging detallado para depuración
            logger.info(
              `Bundle Transaction >>> Kafka decision resource_type=${resourceType} publish=${shouldPublishToKafka}`
            );

            if (shouldPublishToKafka) {
              try {
                const kafkaManager = globals.get(KAFKA_MANAGER);
                if (kafkaManager) {
                  const topic = kafkaConfig.topic;
                  logger.info(
                    `Bundle Transaction >>> Publishing resource_type=${resourceType}`
                  );
                  await kafkaManager.send({
                    topic,
                    message: resource
                  });
                  logger.info(
                    `Bundle Transaction >>> Published resource_type=${resourceType}`
                  );
                } else {
                  logger.warn(
                    `Bundle Transaction >>> Kafka unavailable resource_type=${resourceType}`
                  );
                }
              } catch (kafkaError) {
                logger.error(
                  `Bundle Transaction >>> Kafka publish failed resource_type=${resourceType} code=${kafkaError && kafkaError.name ? kafkaError.name : 'KAFKA_ERROR'}`
                );
                // No fallar el proceso completo si Kafka falla
              }
            } else {
              logger.info(
                `Bundle Transaction >>> Kafka skipped resource_type=${resourceType}`
              );
            }

            // Actualizar estadísticas
            results.processed++;
            logger.info(`Bundle Transaction >>> Stored resource_type=${resourceType}`);

          } catch {
            results.errors++;
            results.details.push(`${resourceType}: error de persistencia`);
            logger.error(`Bundle Transaction >>> Insert failed resource_type=${resourceType}`);
          }
        }

        logger.info(`Bundle Transaction >>> Bundle procesado: ${results.processed} recursos exitosos, ${results.errors} errores`);

        // Continuar con el flujo normal (el framework puede procesar el bundle también)
        // pero ya tenemos los recursos guardados en MongoDB
      }
    } catch (e) {
      logger.error(`Bundle Transaction >>> Error procesando bundle: ${e.message}`);
      // Continuar aunque haya error para no bloquear el flujo
    }
    next();
  });

  async function getPatientFromMongo(patientRef, localBase, log) {
    try {
      // Extraer ID del paciente de la referencia
      const patientId = patientRef.replace('Patient/', '');

      // Obtener el paciente de tu fhir-api (MongoDB)
      log('fetching patient from MongoDB', patientId);
      const localPatient = await fhirGet(localBase, `/Patient/${patientId}`);
      if (localPatient && localPatient.id) {
        log('patient found in MongoDB', patientId);
        return localPatient;
      }

      throw new Error(`Patient ${patientId} not found in MongoDB`);
    } catch (error) {
      log('ERROR fetching patient from MongoDB', error.message);
      throw error;
    }
  }

  server.app.post('/alerts-hook', legacyEndpointAccess, async (req, res) => {
    const ns = `alerts:${Math.random().toString(36).slice(2, 8)}`;
    const log = label => logger.info(`${ns} ${label}`);
    try {
      const body = req.body || {};
      const localBase = buildLocalFhirBase();
      let anyProcessed = false;
      let totalProposals = 0;

      // Función auxiliar para procesar propuestas
      async function processProposals(proposals, planId, subjectRef, obs) {
        // Normalizar: obs puede ser una Observation o un array de Observations
        const observations = Array.isArray(obs) ? obs : (obs ? [obs] : []);

        let idx = 0;
        for (const cr of proposals) {
          idx++;
          log('processing proposal', `${idx}/${proposals.length}, CR id: ${cr.id || 'no-id'}`);

          const sys = `${localBase.replace(/\/4_0_0$/, '')}/alerts`;
          const baseVal = `${planId}:${cr.id || ('action' + idx)}:${subjectRef}`;
          // Usar todas las Observation IDs si hay múltiples, o solo la primera si hay una
          const obsIds = observations.map(o => o.id).filter(Boolean);
          const val = obsIds.length > 0 ? `${baseVal}:${obsIds.join(',')}` : baseVal;
          const identifiers = [{ system: sys, value: val }];
          if (cr.id) {
            identifiers.push({
              system: `${localBase.replace(/\/4_0_0$/, '')}/alerts/proposal-id`,
              value: cr.id
            });
          }

          const createCR = {
            resourceType: 'CommunicationRequest',
            identifier: identifiers,
            status: cr.status || 'active',
            subject: { reference: subjectRef },
            recipient: cr.recipient,
            payload: cr.payload,
            reasonCode: cr.reasonCode
          };

          if (cr.meta && Array.isArray(cr.meta.profile) && cr.meta.profile.length) {
            createCR.meta = { profile: [...cr.meta.profile] };
          }
          if (Array.isArray(cr.extension) && cr.extension.length) {
            createCR.extension = cr.extension;
          }
          if (cr.priority) {
            createCR.priority = cr.priority;
          }
          if (cr.intent) {
            createCR.intent = cr.intent;
          } else {
            createCR.intent = 'proposal';
          }

          const searchUrl = `/CommunicationRequest?identifier=${encodeURIComponent(sys + '|' + val)}`;
          log('searching existing CR', searchUrl);
          const existingCRs = await fhirGet(localBase, searchUrl);
          let topCR = null;

          if (existingCRs.total > 0 && existingCRs.entry && existingCRs.entry[0]) {
            topCR = existingCRs.entry[0].resource;
            log('found existing CR', topCR.id);
          } else {
            log('creating new CR', JSON.stringify(createCR));
            try {
              const crService = require('./services/communicationrequest/communicationrequest.service');
              topCR = await crService.create(
                { base_version: '4_0_0' },
                { req: { body: createCR } }
              );
              if (!topCR || !topCR.id) {
                log('ERROR: CR created without id', 'skipping');
                continue;
              }
              log('created CR', topCR.id);
            } catch (crError) {
              log('ERROR creating CR', crError.message);
              log('CR payload was', JSON.stringify(createCR));
              throw crError;
            }
          }

          // Ensure extensions/priority/intent merged if missing
          if (topCR && topCR.id) {
            let needsUpdate = false;
            const updated = Object.assign({}, topCR);
            if ((!updated.extension || !updated.extension.length) && Array.isArray(cr.extension) && cr.extension.length) {
              updated.extension = cr.extension;
              needsUpdate = true;
            }
            if (!updated.priority && cr.priority) {
              updated.priority = cr.priority;
              needsUpdate = true;
            }
            if (!updated.intent && cr.intent) {
              updated.intent = cr.intent;
              needsUpdate = true;
            }
            if (cr.id && Array.isArray(updated.identifier) && !updated.identifier.find(i => i.system === `${localBase.replace(/\/4_0_0$/, '')}/alerts/proposal-id`)) {
              updated.identifier = [...updated.identifier, {
                system: `${localBase.replace(/\/4_0_0$/, '')}/alerts/proposal-id`,
                value: cr.id
              }];
              needsUpdate = true;
            }
            if (needsUpdate) {
              topCR = await fhirPut(localBase, `/CommunicationRequest/${topCR.id}`, updated);
            }
          }

          // Extraer note_text directamente del CommunicationRequest.note[].text
          // El CQF Ruler ya genera el mensaje apropiado en note.text
          let noteText = null;
          if (topCR && Array.isArray(topCR.note) && topCR.note.length > 0) {
            // Tomar el primer note.text disponible
            const firstNote = topCR.note.find(n => n && n.text);
            if (firstNote && firstNote.text) {
              noteText = firstNote.text;
            }
          }

          // Enviar alerta a Supabase directamente desde CommunicationRequest
          let supabaseSuccess = false;
          try {
            const sb = require('./supabase');
            if (sb && sb.isEnabled && sb.isEnabled()) {
              // Pasar todas las Observations o la primera si solo hay una
              await sb.insertAlertFromCommunicationRequest({
                commRequest: topCR,
                observation: observations.length === 1 ? observations[0] : observations,
                localBase
              });
              log('supabase alert inserted', topCR.id);
              supabaseSuccess = true;
            }
          } catch (sbErr) {
            log('supabase insert error', sbErr && sbErr.message);
          }

          // Crear Communication como auditoría FHIR si Supabase fue exitoso
          if (supabaseSuccess || !require('./supabase').isEnabled()) {
            const commSys = `${localBase.replace(/\/4_0_0$/, '')}/alerts/delivery`;
            const commVal = `cr-${topCR.id}`;

            // Verificar si ya existe
            const existingComms = await fhirGet(localBase, `/Communication?identifier=${encodeURIComponent(commSys + '|' + commVal)}`);
            if (!(existingComms.total > 0 && existingComms.entry && existingComms.entry[0])) {

              const commPayload = {
                resourceType: 'Communication',
                identifier: [{ system: commSys, value: commVal }],
                basedOn: [{ reference: `CommunicationRequest/${topCR.id}` }],
                status: 'completed',
                subject: topCR.subject,
                recipient: topCR.recipient || [],
                payload: topCR.payload || [{ contentString: 'Alert notification delivered' }],
                sent: new Date().toISOString()
              };

              // Agregar todas las Observations como about
              if (observations.length > 0) {
                commPayload.about = observations
                  .map(o => o.id)
                  .filter(Boolean)
                  .map(id => ({ reference: `Observation/${id}` }));
              }
              if (noteText) {
                commPayload.note = [{ text: noteText }];
              }

              try {
                const commService = require('./services/communication/communication.service');
                const createdComm = await commService.create(
                  { base_version: '4_0_0' },
                  { req: { body: commPayload } }
                );
                log('created Communication audit', createdComm && createdComm.id || 'no-id');
              } catch (commErr) {
                log('ERROR creating Communication audit', commErr.message);
              }
            } else {
              log('Communication audit already exists', 'skipping');
            }
          }
        }
      }

      // Caso 1: Observation individual
      if (body.resourceType === 'Observation') {
        if (!body.subject || !body.subject.reference) {
          return res.status(200).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'information', code: 'informational', diagnostics: 'no subject' }]
          });
        }

        const subjectRef = body.subject.reference;
        const planIds = resolvePlanIdsFromObservation(req, body);
        if (!planIds.length) {
          return res.status(200).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'information', code: 'informational', diagnostics: 'no matching plan' }]
          });
        }

        log('processing single observation', subjectRef);
        const patientData = await getPatientFromMongo(subjectRef, localBase, log);

        // Asegurar que Patient y Observation tengan ids únicos
        const patientWithId = Object.assign({}, patientData);
        if (!patientWithId.id) {
          const patientRefMatch = subjectRef.match(/Patient\/(.+)$/);
          patientWithId.id = patientRefMatch ? patientRefMatch[1] : `patient-${Date.now()}`;
        }

        const observationWithId = Object.assign({}, body);
        if (!observationWithId.id) {
          const codings = (observationWithId.code && observationWithId.code.coding) || [];
          const loincCode = (codings.find(c => c.system === 'http://loinc.org') || {}).code || 'obs';
          observationWithId.id = `temp-${loincCode}-${Date.now()}`;
        }

        // Crear Bundle con Patient + Observation (con fullUrl para identificación única)
        const dataBundle = {
          resourceType: 'Bundle',
          type: 'collection',
          entry: [
            {
              fullUrl: `urn:uuid:patient-${patientWithId.id}`,
              resource: patientWithId
            },
            {
              fullUrl: `urn:uuid:${observationWithId.id}`,
              resource: observationWithId
            }
          ]
        };

        // Procesar cada PlanDefinition
        for (const planId of planIds) {
          log('apply plan', `${planId} for single observation`);
          const params = {
            resourceType: 'Parameters',
            parameter: [
              { name: 'subject', valueString: subjectRef },
              { name: 'data', resource: dataBundle }
            ]
          };

          let applied;
          try {
            log('calling cqf-ruler', `${CQF_BASE}/PlanDefinition/${planId}/$apply`);
            applied = await fhirPost(CQF_BASE, `/PlanDefinition/${planId}/$apply`, params);
            log('cqf-ruler response', `status: ok, contained: ${applied.contained ? applied.contained.length : 0}`);
          } catch (error) {
            // Si el PlanDefinition no existe (404), continuar con el siguiente plan
            if (error.message && error.message.includes('404')) {
              log('plan not found', `PlanDefinition/${planId} does not exist in CQF Ruler, skipping`);
              continue;
            }
            // Para otros errores, loguear y continuar
            log('cqf-ruler error', `Error calling PlanDefinition/${planId}/$apply: ${error.message}`);
            continue;
          }

          const proposals = (applied.contained || []).filter(r => r.resourceType === 'CommunicationRequest');
          log('filtered proposals', `found ${proposals.length} CommunicationRequest proposals`);

          if (proposals.length) {
            anyProcessed = true;
            totalProposals += proposals.length;
            await processProposals(proposals, planId, subjectRef, body);
          }
        }
      }
      // Caso 2: Bundle completo
      else if (body.resourceType === 'Bundle' && Array.isArray(body.entry)) {
        log('processing bundle', `found ${body.entry.length} entries`);

        // Extraer todas las Observations del Bundle preservando fullUrl e id
        const observationsWithMeta = body.entry
          .filter(e => e.resource && e.resource.resourceType === 'Observation')
          .map(e => ({
            resource: e.resource,
            fullUrl: e.fullUrl || null,
            originalId: e.resource.id || null
          }));

        // Asegurar que cada Observation tenga un identificador único
        let observationCounter = 0;
        observationsWithMeta.forEach(obsMeta => {
          if (!obsMeta.resource.id && !obsMeta.fullUrl) {
            // Generar un id temporal único basado en el índice y el LOINC code
            const codings = (obsMeta.resource.code && obsMeta.resource.code.coding) || [];
            const loincCode = (codings.find(c => c.system === 'http://loinc.org') || {}).code || 'obs';
            obsMeta.resource.id = `temp-${loincCode}-${Date.now()}-${observationCounter++}`;
          } else if (obsMeta.fullUrl && !obsMeta.resource.id) {
            // Usar el fullUrl como id si existe pero el recurso no tiene id
            const match = obsMeta.fullUrl.match(/[^:]+:([^/]+)$/);
            if (match) {
              obsMeta.resource.id = match[1];
            } else {
              obsMeta.resource.id = `temp-${Date.now()}-${observationCounter++}`;
            }
          }
        });

        const observations = observationsWithMeta.map(o => o.resource);

        if (!observations.length) {
          return res.status(200).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'information', code: 'informational', diagnostics: 'no observations found' }]
          });
        }

        // Obtener todos los subjectRefs únicos
        const subjectRefs = [...new Set(
          observations
            .map(o => o.subject && o.subject.reference)
            .filter(Boolean)
        )];

        if (!subjectRefs.length) {
          return res.status(200).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'information', code: 'informational', diagnostics: 'no valid subjects' }]
          });
        }

        // Obtener todos los PlanDefinitions únicos necesarios
        const allPlanIds = new Set();
        observations.forEach(obs => {
          const planIds = resolvePlanIdsFromObservation(req, obs);
          planIds.forEach(pid => allPlanIds.add(pid));
        });

        if (!allPlanIds.size) {
          return res.status(200).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'information', code: 'informational', diagnostics: 'no matching plans' }]
          });
        }

        log('processing bundle', `${observations.length} observations, ${subjectRefs.length} subjects, ${allPlanIds.size} plans`);

        // Para cada paciente, agrupar Observations por PlanDefinition y enviar solo las relevantes
        const processedSubjects = new Map();

        for (const subjectRef of subjectRefs) {
          log('processing subject', subjectRef);

          // Obtener paciente (cachear)
          let patientData;
          if (processedSubjects.has(subjectRef)) {
            patientData = processedSubjects.get(subjectRef);
          } else {
            patientData = await getPatientFromMongo(subjectRef, localBase, log);
            processedSubjects.set(subjectRef, patientData);
          }

          // Filtrar Observations de este paciente
          const subjectObservations = observations.filter(o =>
            o.subject && o.subject.reference === subjectRef
          );

          // Agrupar Observations por PlanDefinition
          // Map<planId, observations[]>
          const observationsByPlan = new Map();
          subjectObservations.forEach(obs => {
            const planIds = resolvePlanIdsFromObservation(req, obs);
            planIds.forEach(planId => {
              if (!observationsByPlan.has(planId)) {
                observationsByPlan.set(planId, []);
              }
              observationsByPlan.get(planId).push(obs);
            });
          });

          log('observations grouped by plan', `${observationsByPlan.size} plans, ${subjectObservations.length} total observations`);

          // Procesar cada PlanDefinition con solo sus Observations relevantes
          for (const [planId, relevantObservations] of observationsByPlan) {
            log('apply plan', `${planId} for subject ${subjectRef} with ${relevantObservations.length} relevant observations`);

            // Asegurar que el Patient tenga un id
            const patientWithId = Object.assign({}, patientData);
            if (!patientWithId.id) {
              const patientRefMatch = subjectRef.match(/Patient\/(.+)$/);
              patientWithId.id = patientRefMatch ? patientRefMatch[1] : `patient-${Date.now()}`;
            }

            // Crear Bundle solo con Patient + Observations relevantes para este Plan
            // Cada entrada debe tener fullUrl para que el CQF Ruler pueda identificarlas
            const dataBundle = {
              resourceType: 'Bundle',
              type: 'collection',
              entry: [
                {
                  fullUrl: `urn:uuid:patient-${patientWithId.id}`,
                  resource: patientWithId
                },
                ...relevantObservations.map((o, idx) => ({
                  fullUrl: o.id ? `urn:uuid:${o.id}` : `urn:uuid:obs-${planId}-${idx}-${Date.now()}`,
                  resource: o
                }))
              ]
            };

            log('bundle for plan', `${dataBundle.entry.length} resources (1 patient + ${relevantObservations.length} observations)`);

            const params = {
              resourceType: 'Parameters',
              parameter: [
                { name: 'subject', valueString: subjectRef },
                { name: 'data', resource: dataBundle }
              ]
            };

            let applied;
            try {
              log('calling cqf-ruler', `${CQF_BASE}/PlanDefinition/${planId}/$apply`);
              applied = await fhirPost(CQF_BASE, `/PlanDefinition/${planId}/$apply`, params);
              log('cqf-ruler response', `status: ok, contained: ${applied.contained ? applied.contained.length : 0}`);
            } catch (error) {
              // Si el PlanDefinition no existe (404), continuar con el siguiente plan
              if (error.message && error.message.includes('404')) {
                log('plan not found', `PlanDefinition/${planId} does not exist in CQF Ruler, skipping`);
                continue;
              }
              // Para otros errores, loguear y continuar
              log('cqf-ruler error', `Error calling PlanDefinition/${planId}/$apply: ${error.message}`);
              continue;
            }

            const proposals = (applied.contained || []).filter(r => r.resourceType === 'CommunicationRequest');
            log('filtered proposals', `found ${proposals.length} CommunicationRequest proposals`);

            if (proposals.length) {
              anyProcessed = true;
              totalProposals += proposals.length;

              // Procesar propuestas - asociar cada una con todas las Observations relevantes
              // Esto permite que el note_text incluya información de todas las Observations que triggeraron el alert
              await processProposals(proposals, planId, subjectRef, relevantObservations);
            }
          }
        }
      } else {
        return res.status(200).json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'information', code: 'informational', diagnostics: 'invalid resource type' }]
        });
      }

      const obsCount = body.resourceType === 'Observation' ? 1 :
        (body.resourceType === 'Bundle' ? (body.entry || []).filter(e => e.resource && e.resource.resourceType === 'Observation').length : 0);
      const diag = anyProcessed ? `processed proposals=${totalProposals} from ${obsCount} observations` : 'no alert proposed';
      return res.status(200).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'information', code: 'informational', diagnostics: diag }]
      });
    } catch (e) {
      logger.error(
        `[alerts-hook] processing failed code=${e && e.name ? e.name : 'ALERT_PROCESSING_ERROR'}`
      );
      return res.status(200).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'exception', diagnostics: e.message }]
      });
    }
  });

  // Middleware to intercept all POST requests and publish to Kafka if enabled
  server.app.use(async (req, res, next) => {
    const endpoint = req.originalUrl;
    // Extract resource from URL, e.g. /4_0_0/Observation -> Observation
    const resourceMatch = endpoint.match(/\/?[\w_]+\/([A-Za-z]+)/);
    const resource = resourceMatch ? resourceMatch[1] : null;
    // Never log the request URL or body here. FHIR paths may contain resource
    // identifiers and bodies contain health data. Controlled metadata is
    // sufficient for operating the middleware.
    logger.debug(
      `[KafkaMiddleware] Request inspected method=${req.method} resource=${resource || 'none'} content_type=${req.get('Content-Type') || 'none'}`
    );
    const shouldPublish =
      req.method === 'POST' &&
      kafkaConfig.enabled &&
      Array.isArray(kafkaConfig.endpoints) &&
      resource &&
      kafkaConfig.endpoints.includes(resource);
    if (shouldPublish) {
      logger.info(
        `[KafkaMiddleware] Publishing to Kafka. Resource matched: ${resource}`
      );
      try {
        const kafkaManager = globals.get(KAFKA_MANAGER);
        if (kafkaManager) {
          const topic = kafkaConfig.topic;
          logger.debug(`[KafkaMiddleware] Publishing configured resource topic=${topic}`);
          if (
            !req.body ||
            (typeof req.body === 'object' && Object.keys(req.body).length === 0)
          ) {
            logger.warn(
              '[KafkaMiddleware] Warning: req.body is empty or not parsed!'
            );
          }
          await kafkaManager.send({
            topic,
            message: req.body,
          });
          logger.info('[KafkaMiddleware] Message published successfully.');
        } else {
          logger.warn('[KafkaMiddleware] KafkaManager not found in globals.');
        }
      } catch (err) {
        logger.error(
          `[KafkaMiddleware] Publish failed code=${err && err.name ? err.name : 'KAFKA_PUBLISH_FAILED'}`
        );
      }
    } else {
      logger.debug(
        `[KafkaMiddleware] Not publishing. POST: ${req.method === 'POST'}, enabled: ${kafkaConfig.enabled}, endpoints: ${JSON.stringify(kafkaConfig.endpoints)}, resource: ${resource}, matched: ${resource && kafkaConfig.endpoints.includes(resource)}`
      );
    }
    next();
  });

  // Configure Swagger UI
  server.app.use('/api-docs', serve, setup);

  // Additional endpoint to access documentation
  server.app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  logger.info('Swagger UI configurado en: /api-docs y /docs');

  /**
   * @swagger
   * /4_0_0/Observation/{id}/alert:
   *   post:
   *     tags:
   *       - Observation
   *     summary: Marcar una Observation como alerta
   *     description: Añade el tag anomaly en meta.tag si no existe y devuelve la Observation actualizada.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID real de la Observation en FHIR
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Observation marcada como alerta o ya marcada previamente
   *         content:
   *           application/fhir+json:
   *             schema:
  *               type: object
  *               description: Respuesta con la Observation actualizada. El ejemplo resalta el tag anomaly añadido en meta.tag.
  *               properties:
  *                 meta:
  *                   type: object
  *                   properties:
  *                     tag:
  *                       type: array
  *                       items:
  *                         type: object
  *                         properties:
  *                           system:
  *                             type: string
  *                             example: https://example.invalid/alert-engine
  *                           code:
  *                             type: string
  *                             example: anomaly
  *                           display:
  *                             type: string
  *                             example: Anomaly
  *             example:
  *               meta:
  *                 tag:
  *                   - system: https://example.invalid/alert-engine
  *                     code: anomaly
  *                     display: Anomaly
  *       400:
  *         description: Error procesando la Observation. La respuesta incluye diagnostics con la causa concreta.
  *         content:
  *           application/fhir+json:
  *             schema:
  *               $ref: '#/components/schemas/OperationOutcome'
  *       401:
  *         description: Token ausente o inválido
  *         content:
  *           application/fhir+json:
  *             schema:
  *               $ref: '#/components/schemas/OperationOutcome'
   *       404:
   *         description: Observation no encontrada
   *         content:
   *           application/fhir+json:
   *             schema:
   *               $ref: '#/components/schemas/OperationOutcome'
   *       500:
   *         description: Error interno al persistir la Observation
   *         content:
   *           application/fhir+json:
   *             schema:
   *               $ref: '#/components/schemas/OperationOutcome'
   */
  server.app.post('/4_0_0/Observation/:id/alert', legacyEndpointAccess, async (req, res) => {
    try {
      const updatedObservation = await observationService.markAsAlert({
        base_version: '4_0_0',
        id: req.params.id,
      });

      if (!updatedObservation) {
        return res.status(404).type('application/fhir+json').json(
          buildOperationOutcome(
            'not-found',
            `Observation ${req.params.id} not found`,
            {
              diagnostics: `No Observation with id "${req.params.id}" was found in the 4_0_0 store for this API instance.`,
              expression: [`Observation/${req.params.id}`],
            }
          )
        );
      }

      return res.status(200).type('application/fhir+json').json(updatedObservation);
    } catch (error) {
      logger.error(
        `[ObservationAlert] update failed code=${error && error.name ? error.name : 'OBSERVATION_ALERT_ERROR'}`
      );
      const statusCode = Number.isInteger(error.code) ? error.code : 500;
      const responseMessage = statusCode === 400
        ? `Failed to mark Observation ${req.params.id} as alert: ${error.message || 'Unknown processing error.'}`
        : `Failed to mark Observation ${req.params.id} as alert`;
      const diagnostics = error.diagnostics || error.message || 'Unexpected error';
      const issueCode = statusCode === 400 ? 'processing' : 'exception';

      return res.status(statusCode).type('application/fhir+json').json(
        buildOperationOutcome(issueCode, responseMessage, {
          diagnostics,
          expression: [`Observation/${req.params.id}`],
        })
      );
    }
  });

  // Configure timeouts and headers for large files
  server.app.use('/upload-bundle', legacyEndpointAccess, (req, res, next) => {
    res.setTimeout(600000);
    // Set headers for proxies
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    logger.info('Bundle Upload >>> Authorized request received');
    next();
  });

  // Endpoint to upload FHIR Bundles via form-data
  server.app.post(
    '/upload-bundle',
    (req, res, next) => {
      // Check if it is multipart/form-data
      const contentType = req.get('Content-Type') || '';
      if (!contentType.includes('multipart/form-data')) {
        logger.warn('Bundle Upload >>> Invalid content type');
        return res.status(400).json({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'structure',
              details: {
                text:
                  'Debe usar multipart/form-data con un campo "bundle" de tipo archivo.',
              },
            },
          ],
        });
      }

      // If multipart/form-data, use multer with error handling
      upload.single('bundle')(req, res, (err) => {
        if (err) {
          logger.error(
            `Bundle Upload >>> Upload rejected code=${err && err.code ? err.code : 'UPLOAD_ERROR'}`
          );
          return res.status(400).json({
            resourceType: 'OperationOutcome',
            issue: [
              {
                severity: 'error',
                code: 'structure',
                details: { text: 'Error procesando archivo.' },
              },
            ],
          });
        }
        next();
      });
    },
    processBundleUpload
  );

  logger.info('Bundle upload endpoint agregado: POST /upload-bundle');

  // Configure the FHIR server
  server
    .configureMiddleware()
    .configureSession()
    .configureHelmet()
    .configurePassport()
    .setPublicDirectory()
    .setProfileRoutes()
    .setErrorRoutes();

  // Start the server
  server.listen(fhirServerConfig.server.port, () => {
    logger.verbose('Server is up and running!');
    logger.info(
      `📚 Documentación Swagger disponible en: http://localhost:${fhirServerConfig.server.port}/api-docs`
    );
    logger.info(
      `📖 Documentación alternativa en: http://localhost:${fhirServerConfig.server.port}/docs`
    );
    logger.info(
      `🏥 Endpoints FHIR disponibles en: http://localhost:${fhirServerConfig.server.port}/4_0_0/metadata`
    );
  });
  attachSportsRealtimeWebSocket(server.app, {
    db: client.db(mongoConfig.db_name),
    kafkaManager: globals.get(KAFKA_MANAGER),
    logger
  });
};

main();
