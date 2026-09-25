'use strict';

const { URL } = require('url');

const LOCAL_MONGO_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'mongo',
]);

function booleanEnv(value, name) {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  throw new Error(`${name} must be true or false.`);
}

function hostsFromMongoUri(connection) {
  if (
    typeof connection !== 'string' ||
    (!connection.startsWith('mongodb://') &&
      !connection.startsWith('mongodb+srv://'))
  ) {
    throw new Error('MongoDB connection must use mongodb:// or mongodb+srv://.');
  }
  const authority = connection
    .slice(connection.indexOf('://') + 3)
    .split('/', 1)[0]
    .split('@')
    .pop();
  const hosts = authority.split(',').map(value => {
    const parsed = new URL(`mongodb://${value}`);
    return parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  });
  if (hosts.length === 0 || hosts.some(host => !host)) {
    throw new Error('MongoDB connection contains an invalid host.');
  }
  return hosts;
}

function connectionFromParts(env) {
  const hostname = env.MONGO_HOSTNAME;
  const database = env.MONGO_DB_NAME;
  if (!hostname || !database) {
    throw new Error('MONGO_HOSTNAME and MONGO_DB_NAME are required.');
  }
  const authSource = env.MONGO_AUTH_SOURCE || 'admin';
  let credentials = '';
  if (env.MONGO_USERNAME || env.MONGO_PASSWORD) {
    if (!env.MONGO_USERNAME || !env.MONGO_PASSWORD) {
      throw new Error('MongoDB username and password must be configured together.');
    }
    credentials = `${encodeURIComponent(env.MONGO_USERNAME)}:${encodeURIComponent(
      env.MONGO_PASSWORD,
    )}@`;
  }
  return `mongodb://${credentials}${hostname}/${encodeURIComponent(
    database,
  )}?authSource=${encodeURIComponent(authSource)}`;
}

function buildStep1MongoConfig(env = process.env) {
  const database = env.MONGO_DB_NAME;
  if (!database) {
    throw new Error('MONGO_DB_NAME is required.');
  }
  const connection = env.MONGO_URI || connectionFromParts(env);
  const hosts = hostsFromMongoUri(connection);
  const localOnly = hosts.every(host => LOCAL_MONGO_HOSTS.has(host));
  const tls = booleanEnv(env.MONGO_TLS, 'MONGO_TLS');
  const caFile = env.MONGO_TLS_CA_FILE;
  const certificateKeyFile = env.MONGO_TLS_CERTIFICATE_KEY_FILE;

  if (!localOnly && !tls) {
    throw new Error('Remote MongoDB requires MONGO_TLS=true.');
  }
  if (tls && !caFile) {
    throw new Error('MONGO_TLS_CA_FILE is required when MongoDB TLS is enabled.');
  }
  if (!tls && (caFile || certificateKeyFile)) {
    throw new Error('MongoDB TLS files require MONGO_TLS=true.');
  }
  if (
    booleanEnv(
      env.MONGO_TLS_ALLOW_INVALID_CERTIFICATES,
      'MONGO_TLS_ALLOW_INVALID_CERTIFICATES',
    )
  ) {
    throw new Error('Invalid MongoDB certificates are never allowed.');
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
  };
  if (tls) {
    options.tls = true;
    options.tlsCAFile = caFile;
    if (certificateKeyFile) {
      options.tlsCertificateKeyFile = certificateKeyFile;
    }
  }

  return {
    connection,
    db_name: database,
    options,
  };
}

module.exports = {
  LOCAL_MONGO_HOSTS,
  buildStep1MongoConfig,
  hostsFromMongoUri,
};
