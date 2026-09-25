'use strict';

const fs = require('fs');
const path = require('path');
const {
  createLegacyEndpointAccess,
} = require('../src/middleware/legacy-endpoint-access');

function responseRecorder() {
  const response = {
    body: null,
    contentType: null,
    statusCode: null,
  };
  response.status = jest.fn(code => {
    response.statusCode = code;
    return response;
  });
  response.type = jest.fn(value => {
    response.contentType = value;
    return response;
  });
  response.json = jest.fn(value => {
    response.body = value;
    return response;
  });
  return response;
}

function requestWithCanaries() {
  return {
    originalUrl: '/upload-bundle?patient=secret-patient-canary',
    headers: { authorization: 'Bearer secret-token-canary' },
    body: { note: 'secret-body-canary' },
  };
}

describe('legacy custom endpoint access', () => {
  test('fails closed without a valid bearer and never logs request data', () => {
    const authenticate = jest.fn((_name, _options, callback) => (req, res, next) => {
      void req;
      void next;
      callback(null, false);
    });
    const logger = { warn: jest.fn(), error: jest.fn() };
    const middleware = createLegacyEndpointAccess({
      authEnabled: true,
      endpointsEnabled: true,
      strategyName: 'bearer',
      passport: { authenticate },
      logger,
    });
    const request = requestWithCanaries();
    const response = responseRecorder();
    const next = jest.fn();

    middleware(request, response, next);

    expect(response.statusCode).toBe(401);
    expect(response.contentType).toBe('application/fhir+json');
    expect(response.body.resourceType).toBe('OperationOutcome');
    expect(next).not.toHaveBeenCalled();
    const logs = JSON.stringify(logger.warn.mock.calls.concat(logger.error.mock.calls));
    expect(logs).not.toContain('secret-patient-canary');
    expect(logs).not.toContain('secret-token-canary');
    expect(logs).not.toContain('secret-body-canary');
  });

  test('accepts an authenticated principal without logging identity', () => {
    const user = { sub: 'secret-user-canary' };
    const authenticate = jest.fn((_name, _options, callback) => (req, res, next) => {
      void req;
      void res;
      void next;
      callback(null, user);
    });
    const logger = { warn: jest.fn(), error: jest.fn() };
    const middleware = createLegacyEndpointAccess({
      authEnabled: true,
      endpointsEnabled: true,
      strategyName: 'bearer',
      passport: { authenticate },
      logger,
    });
    const request = requestWithCanaries();
    const next = jest.fn();

    middleware(request, responseRecorder(), next);

    expect(request.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logger)).not.toContain('secret-user-canary');
  });

  test('fails closed when auth is enabled but the strategy is unavailable', () => {
    const middleware = createLegacyEndpointAccess({
      authEnabled: true,
      endpointsEnabled: true,
      logger: { warn: jest.fn(), error: jest.fn() },
    });
    const response = responseRecorder();
    const next = jest.fn();

    middleware(requestWithCanaries(), response, next);

    expect(response.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('keeps explicit unauthenticated synthetic-local mode available', () => {
    const middleware = createLegacyEndpointAccess({
      authEnabled: false,
      endpointsEnabled: true,
    });
    const next = jest.fn();

    middleware(requestWithCanaries(), responseRecorder(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns not found when Step 1 explicitly disables legacy endpoints', () => {
    const authenticate = jest.fn();
    const middleware = createLegacyEndpointAccess({
      authEnabled: true,
      endpointsEnabled: false,
      strategyName: 'bearer',
      passport: { authenticate },
    });
    const response = responseRecorder();
    const next = jest.fn();

    middleware(requestWithCanaries(), response, next);

    expect(response.statusCode).toBe(404);
    expect(response.body.issue[0].code).toBe('not-supported');
    expect(authenticate).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('route wiring and source logs do not expose URL, headers, or bundle content', () => {
    const indexSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
    const uploadSource = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'bundle-upload.js'),
      'utf8',
    );

    expect(indexSource).toMatch(
      /server\.app\.post\('\/alerts-hook', legacyEndpointAccess/,
    );
    expect(indexSource).toMatch(
      /server\.app\.post\('\/4_0_0\/Observation\/:id\/alert', legacyEndpointAccess/,
    );
    expect(indexSource).toMatch(
      /server\.app\.use\('\/upload-bundle', legacyEndpointAccess/,
    );
    expect(indexSource).not.toContain(
      '[KafkaMiddleware] Incoming request: ${req.method} ${endpoint}',
    );
    expect(uploadSource).not.toMatch(/JSON\.stringify\(req\.headers\)/);
    expect(uploadSource).not.toMatch(/fileContent\.substring/);
    expect(uploadSource).not.toMatch(/req\.file\.originalname/);
  });
});
