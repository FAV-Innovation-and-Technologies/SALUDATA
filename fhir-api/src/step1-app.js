'use strict';

const express = require('express');
const helmet = require('helmet');
const { registerMeasurementIngestion } = require('./routes/measurement-ingestion');

function operationOutcome(code, text) {
  return {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: 'error',
        code,
        details: { text },
      },
    ],
  };
}

function createStep1App(options) {
  const settings = options || {};
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    express.json({
      type: ['application/json', 'application/fhir+json'],
      limit: '1mb',
      strict: true,
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'step1-ingestion' });
  });

  const ingestion = registerMeasurementIngestion({
    app,
    db: settings.db,
    kafkaManager: settings.kafkaManager,
    logger: settings.logger,
    authenticate: settings.authenticate,
    syntheticAuthRequired: settings.syntheticAuthRequired,
    syntheticBearerToken: settings.syntheticBearerToken,
    mode: settings.mode,
    topic: settings.topic,
    publishingEnabled: settings.publishingEnabled,
    outboxIntervalMs: settings.outboxIntervalMs,
  });

  app.use((error, _req, res, _next) => {
    void error;
    settings.logger.warn('[Step1Ingestion] request rejected code=INVALID_REQUEST_BODY');
    res
      .status(400)
      .type('application/fhir+json')
      .json(operationOutcome('structure', 'The request body is invalid.'));
  });

  app.use((_req, res) => {
    res
      .status(404)
      .type('application/fhir+json')
      .json(operationOutcome('not-found', 'Endpoint not found.'));
  });

  return { app, ingestion };
}

module.exports = {
  createStep1App,
  operationOutcome,
};
