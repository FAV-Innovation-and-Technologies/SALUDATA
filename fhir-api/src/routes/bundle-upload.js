const multer = require('multer');
const globals = require('../globals');
const { CLIENT_DB } = require('../constants');
const logger = require('@bluehalo/node-fhir-server-core').loggers.get();

// Configurar multer para archivos en memoria con configuración más robusta para proxies
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB límite
        fieldSize: 100 * 1024 * 1024, // 100MB límite para campos
        files: 1, // Solo un archivo
        fields: 1, // Solo un campo
    },
    fileFilter: function (req, file, cb) {
        logger.info(`Bundle Upload >>> File received type=${file.mimetype || 'unknown'}`);

        // Aceptar solo archivos JSON
        if (file.mimetype === 'application/json' ||
            file.originalname.endsWith('.json') ||
            file.mimetype === 'text/plain' ||
            file.mimetype === 'application/octet-stream') {
            cb(null, true);
        } else {
            logger.warn('Bundle Upload >>> File type rejected');
            cb(new Error('Solo se permiten archivos JSON'), false);
        }
    }
});

/**
 * Procesar Bundle FHIR subido via form-data
 */
async function processBundleUpload(req, res) {
    try {
        logger.info('Bundle Upload >>> Procesando archivo subido');
        if (!req.file) {
            logger.error('Bundle Upload >>> No se encontró archivo en la request');
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'required',
                    details: { text: 'No se encontró archivo en el campo "bundle". Asegúrate de usar multipart/form-data con un campo llamado "bundle".' }
                }]
            });
        }

        logger.info(`Bundle Upload >>> File accepted bytes=${req.file.size}`);

        // Parse del JSON desde el buffer
        let bundleData;
        try {
            const fileContent = req.file.buffer.toString('utf8');
            bundleData = JSON.parse(fileContent);
        } catch (parseError) {
            void parseError;
            logger.error('Bundle Upload >>> JSON parsing failed code=INVALID_JSON');
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'structure',
                    details: { text: 'El archivo no contiene JSON válido.' }
                }]
            });
        }

        // Validar que es un Bundle FHIR
        if (!bundleData.resourceType || bundleData.resourceType !== 'Bundle') {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'structure',
                    details: { text: 'El archivo debe ser un Bundle FHIR válido' }
                }]
            });
        }

        if (!bundleData.entry || !Array.isArray(bundleData.entry)) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'structure',
                    details: { text: 'El Bundle debe contener un array "entry"' }
                }]
            });
        }

        // Obtener conexión a MongoDB
        const db = globals.get(CLIENT_DB);
        if (!db) {
            return res.status(500).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'transient',
                    details: { text: 'Error de conexión a la base de datos' }
                }]
            });
        }

        // Procesar recursos del Bundle
        const results = {
            processed: 0,
            errors: 0,
            resourceTypes: {},
            details: []
        };

        logger.info(`Bundle Upload >>> Procesando ${bundleData.entry.length} recursos del Bundle`);

        for (let i = 0; i < bundleData.entry.length; i++) {
            const entry = bundleData.entry[i];
            if (!entry.resource) { continue; }

            const resource = entry.resource;
            const resourceType = resource.resourceType;

            if (!resourceType) {
                results.errors++;
                results.details.push(`Entrada ${i + 1}: Sin resourceType`);
                continue;
            }

            try {
                // Crear colecciones para el recurso y su historial
                const collectionName = `${resourceType}_4_0_0`;
                const historyCollectionName = `${resourceType}_4_0_0_History`;

                const collection = db.collection(collectionName);
                const historyCollection = db.collection(historyCollectionName);

                // Asegurar que el recurso tenga un id coherente
                //
                // Para Observation provenientes de dispositivos via /upload-bundle,
                // queremos que cada medición sea un recurso distinto, incluso si
                // el bundle trae un id fijo (p.ej. "heart-rate-cosinuss-two").
                // Por eso siempre generamos un nuevo id único para Observation.
                if (resourceType === 'Observation') {
                    const { getUuid } = require('../utils/uid.util');
                    resource.id = getUuid(resource);
                }

                // Preparar el documento para insertar
                // Eliminar _id si existe para que MongoDB lo genere automáticamente
                const doc = Object.assign({}, resource);
                if (doc._id) {
                    delete doc._id;
                }

                // Insertar en la colección principal
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

                // Actualizar estadísticas
                results.processed++;
                if (!results.resourceTypes[resourceType]) {
                    results.resourceTypes[resourceType] = 0;
                }
                results.resourceTypes[resourceType]++;

            } catch (insertError) {
                void insertError;
                results.errors++;
                results.details.push(`${resourceType}: error de persistencia`);
                logger.error(`Bundle Upload >>> Insert failed resource_type=${resourceType}`);
            }
        }

        // Respuesta exitosa
        logger.info(`Bundle Upload >>> Bundle procesado: ${results.processed} recursos exitosos, ${results.errors} errores`);

        res.status(200).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'information',
                code: 'informational',
                details: {
                    text: `Bundle procesado exitosamente: ${results.processed} recursos insertados, ${results.errors} errores`
                }
            }],
            extension: [{
                url: 'processing-summary',
                valueString: JSON.stringify(results)
            }]
        });

    } catch (error) {
        logger.error(
            `Bundle Upload >>> Processing failed code=${error && error.name ? error.name : 'BUNDLE_UPLOAD_ERROR'}`
        );
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                details: { text: 'Error interno del servidor.' }
            }]
        });
    }
}

module.exports = {
    upload,
    processBundleUpload
};
