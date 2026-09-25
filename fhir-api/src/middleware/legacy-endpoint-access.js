'use strict';

const passport = require('passport');

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

function createLegacyEndpointAccess(options) {
  const settings = options || {};
  const authEnabled = settings.authEnabled === true;
  const endpointsEnabled = settings.endpointsEnabled !== false;
  const strategyName = settings.strategyName;
  const passportInstance = settings.passport || passport;
  const logger = settings.logger || { warn: () => {}, error: () => {} };

  function deny(res, code) {
    logger.warn(`[LegacyEndpointAccess] request denied code=${code}`);
    return res
      .status(401)
      .type('application/fhir+json')
      .json(operationOutcome('login', 'Authentication is required.'));
  }

  return function legacyEndpointAccess(req, res, next) {
    if (!endpointsEnabled) {
      return res
        .status(404)
        .type('application/fhir+json')
        .json(operationOutcome('not-supported', 'This legacy endpoint is disabled.'));
    }

    if (!authEnabled) {
      return next();
    }

    if (typeof strategyName !== 'string' || strategyName.length === 0) {
      logger.error(
        '[LegacyEndpointAccess] authentication unavailable code=AUTH_CONFIGURATION_MISSING',
      );
      return deny(res, 'AUTH_CONFIGURATION_MISSING');
    }

    try {
      const authenticate = passportInstance.authenticate(
        strategyName,
        { session: false },
        (error, user) => {
          if (error || !user) {
            return deny(res, error ? 'AUTH_VALIDATION_ERROR' : 'AUTH_REQUIRED');
          }
          req.user = user;
          return next();
        },
      );
      return authenticate(req, res, next);
    } catch (error) {
      void error;
      logger.error(
        '[LegacyEndpointAccess] authentication unavailable code=AUTH_MIDDLEWARE_ERROR',
      );
      return deny(res, 'AUTH_MIDDLEWARE_ERROR');
    }
  };
}

module.exports = {
  createLegacyEndpointAccess,
  operationOutcome,
};
