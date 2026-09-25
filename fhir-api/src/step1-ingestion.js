'use strict';

require('dotenv').config({ quiet: true });

const { MongoClient } = require('mongodb');
const { mongoConfig, kafkaConfig } = require('./step1-config');
const KafkaManager = require('./lib/kafka-manager');
const { createStep1App } = require('./step1-app');

const logger = Object.freeze({
  info(message) {
    process.stdout.write(`${String(message)}\n`);
  },
  warn(message) {
    process.stderr.write(`${String(message)}\n`);
  },
  error(message) {
    process.stderr.write(`${String(message)}\n`);
  },
});

async function closeSafely(close) {
  try {
    await close();
  } catch (error) {
    void error;
  }
}

async function startStep1Ingestion(options) {
  const settings = options || {};
  const connectMongo =
    settings.connectMongo ||
    ((connection, mongoOptions) =>
      Promise.resolve(new MongoClient(connection, mongoOptions)));
  const createKafkaManager =
    settings.createKafkaManager || (config => new KafkaManager(config));
  const createApp = settings.createApp || createStep1App;
  const processRef = settings.processRef || process;
  const runtimeLogger = settings.logger || logger;
  const effectiveMongoConfig = settings.mongoConfig || mongoConfig;
  const effectiveKafkaConfig = settings.kafkaConfig || kafkaConfig;
  const port = Number(
    settings.port || process.env.SERVER_PORT || process.env.PORT || 3000,
  );
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SERVER_PORT is invalid.');
  }

  let client = null;
  let kafkaManager = null;
  let ingestion = null;
  let server = null;
  let shuttingDown = false;

  async function shutdown() {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    if (ingestion) {
      ingestion.stop();
    }
    if (server) {
      await closeSafely(() => new Promise(resolve => server.close(resolve)));
    }
    if (kafkaManager) {
      await closeSafely(() => kafkaManager.disconnect());
    }
    if (client) {
      await closeSafely(() => client.close());
    }
  }

  try {
    client = await connectMongo(
      effectiveMongoConfig.connection,
      effectiveMongoConfig.options,
    );
    await client.connect();
    const db = client.db(effectiveMongoConfig.db_name);

    if (effectiveKafkaConfig.enabled) {
      kafkaManager = createKafkaManager(effectiveKafkaConfig);
      await kafkaManager.connect();
    }

    const runtime = createApp({ db, kafkaManager, logger: runtimeLogger });
    ingestion = runtime.ingestion;
    await ingestion.deps.ready;

    server = runtime.app.listen(port);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    runtimeLogger.info('[Step1Ingestion] ready');
  } catch (error) {
    await shutdown();
    throw error;
  }

  processRef.once('SIGTERM', () => {
    shutdown().catch(() => {
      processRef.exitCode = 1;
    });
  });
  processRef.once('SIGINT', () => {
    shutdown().catch(() => {
      processRef.exitCode = 1;
    });
  });

  return { shutdown };
}

if (require.main === module) {
  startStep1Ingestion().catch(error => {
    logger.error(
      `[Step1Ingestion] startup failed code=${error && error.name ? error.name : 'STARTUP_ERROR'}`,
    );
    // All owned handles have been closed. Force a non-zero exit so the
    // container supervisor can apply its restart policy.
    process.exit(1);
  });
}

module.exports = { closeSafely, startStep1Ingestion };
