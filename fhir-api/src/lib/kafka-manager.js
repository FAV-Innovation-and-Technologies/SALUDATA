// KafkaManager.js
// Manager to publish messages to a Kafka broker (Redpanda compatible)
// Usage: const kafkaManager = new KafkaManager({ brokers, clientId });
// await kafkaManager.send({ topic, message });

const { Kafka } = require('kafkajs');
const fs = require('fs');

const LOCAL_BROKERS = new Set(['localhost', '127.0.0.1', '::1', 'redpanda', 'kafka']);

function brokerHost(value) {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error('Kafka broker cannot be empty.');
  }
  try {
    return new URL(text.includes('://') ? text : `kafka://${text}`).hostname;
  } catch (error) {
    const invalid = new Error('Kafka broker is invalid.');
    invalid.cause = error;
    throw invalid;
  }
}

function readRequiredFile(path, label, readFile = fs.readFileSync) {
  if (!path) {
    throw new Error(`${label} is required.`);
  }
  return readFile(path);
}

function buildKafkaClientOptions(config, readFile = fs.readFileSync) {
  const brokers = Array.isArray(config.brokers) ? config.brokers.map(value => value.trim()) : [];
  if (brokers.length === 0) {
    throw new Error('At least one Kafka broker is required.');
  }
  const protocol = String(config.securityProtocol || 'PLAINTEXT').toUpperCase();
  if (!['PLAINTEXT', 'SSL', 'SASL_SSL'].includes(protocol)) {
    throw new Error('Unsupported Kafka security protocol.');
  }
  const remote = brokers.some(value => !LOCAL_BROKERS.has(brokerHost(value)));
  if (remote && protocol === 'PLAINTEXT') {
    throw new Error('Remote Kafka brokers require TLS.');
  }

  const options = { clientId: config.clientId, brokers };
  if (protocol === 'SSL' || protocol === 'SASL_SSL') {
    options.ssl = {
      rejectUnauthorized: true,
      ca: [readRequiredFile(config.sslCaLocation, 'Kafka CA certificate', readFile)],
    };
    if (Boolean(config.sslCertificateLocation) !== Boolean(config.sslKeyLocation)) {
      throw new Error('Kafka mTLS certificate and key must be configured together.');
    }
    if (config.sslCertificateLocation) {
      options.ssl.cert = readRequiredFile(
        config.sslCertificateLocation,
        'Kafka client certificate',
        readFile
      );
      options.ssl.key = readRequiredFile(config.sslKeyLocation, 'Kafka client key', readFile);
    }
  }
  if (protocol === 'SASL_SSL') {
    if (!config.saslUsername || !config.saslPassword) {
      throw new Error('Kafka SASL credentials are required.');
    }
    options.sasl = {
      mechanism: String(config.saslMechanism || 'scram-sha-512').toLowerCase(),
      username: config.saslUsername,
      password: config.saslPassword,
    };
  }
  return options;
}

class KafkaManager {
  /**
   * @param {Object} config
   * @param {string[]} config.brokers - List of broker URLs
   * @param {string} config.clientId - Kafka client ID
   */
  constructor(config) {
    this.kafka = new Kafka(buildKafkaClientOptions(config));
    this.producer = this.kafka.producer();
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }

  /**
   * Publish a message to a topic
   * @param {Object} params
   * @param {string} params.topic - Topic name
   * @param {string|Object} params.message - Message to send (string or JSON)
   * @param {string} [params.key] - Optional partition key
   * @param {Object} [params.headers] - Optional headers
   */
  async send({ topic, key, message, headers }) {
    await this.connect();
    const value = typeof message === 'string' ? message : JSON.stringify(message);
    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value,
          headers
        }
      ]
    });
  }

  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}

module.exports = KafkaManager;
module.exports.buildKafkaClientOptions = buildKafkaClientOptions;
