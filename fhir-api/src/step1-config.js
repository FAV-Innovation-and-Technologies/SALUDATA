'use strict';

const { buildStep1MongoConfig } = require('./monitoring/mongo-config');

function buildStep1KafkaConfig(env = process.env) {
  const brokers = String(env.KAFKA_BROKERS || 'localhost:9092')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return {
    brokers,
    clientId: env.KAFKA_CLIENT_ID || 'saludata-step1-ingestion',
    enabled: env.KAFKA_ENABLED === 'true',
    securityProtocol: env.KAFKA_SECURITY_PROTOCOL || 'PLAINTEXT',
    sslCaLocation: env.KAFKA_SSL_CA_LOCATION,
    sslCertificateLocation: env.KAFKA_SSL_CERTIFICATE_LOCATION,
    sslKeyLocation: env.KAFKA_SSL_KEY_LOCATION,
    saslMechanism: env.KAFKA_SASL_MECHANISM || 'scram-sha-512',
    saslUsername: env.KAFKA_SASL_USERNAME,
    saslPassword: env.KAFKA_SASL_PASSWORD,
  };
}

module.exports = {
  buildStep1KafkaConfig,
  kafkaConfig: buildStep1KafkaConfig(),
  mongoConfig: buildStep1MongoConfig(),
};

