'use strict';

const { EventEmitter } = require('events');

jest.mock('../src/step1-config', () => ({
  mongoConfig: {
    connection: 'mongodb://synthetic.invalid/synthetic',
    options: {},
    db_name: 'synthetic',
  },
  kafkaConfig: { enabled: true },
}));

describe('Step 1 ingestion startup lifecycle', () => {
  const previousPort = process.env.SERVER_PORT;

  beforeEach(() => {
    process.env.SERVER_PORT = '3011';
    jest.resetModules();
  });

  afterAll(() => {
    if (previousPort === undefined) {
      delete process.env.SERVER_PORT;
    } else {
      process.env.SERVER_PORT = previousPort;
    }
  });

  test('closes Mongo and Kafka when index initialization fails', async () => {
    const { startStep1Ingestion } = require('../src/step1-ingestion');
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({ synthetic: true }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const kafkaManager = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const ingestion = {
      deps: { ready: Promise.reject(new Error('synthetic index failure')) },
      stop: jest.fn(),
    };
    const app = { listen: jest.fn() };
    const processRef = { once: jest.fn(), exitCode: null };

    await expect(
      startStep1Ingestion({
        connectMongo: jest.fn().mockResolvedValue(client),
        createKafkaManager: jest.fn().mockReturnValue(kafkaManager),
        createApp: jest.fn().mockReturnValue({ app, ingestion }),
        processRef,
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        kafkaConfig: { enabled: true },
      }),
    ).rejects.toThrow('synthetic index failure');

    expect(ingestion.stop).toHaveBeenCalledTimes(1);
    expect(kafkaManager.disconnect).toHaveBeenCalledTimes(1);
    expect(client.close).toHaveBeenCalledTimes(1);
    expect(app.listen).not.toHaveBeenCalled();
    expect(processRef.once).not.toHaveBeenCalled();
  });

  test('closes Mongo when Kafka connect fails', async () => {
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({ synthetic: true }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const kafkaManager = {
      connect: jest.fn().mockRejectedValue(new Error('synthetic kafka failure')),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const { startStep1Ingestion } = require('../src/step1-ingestion');

    await expect(
      startStep1Ingestion({
        connectMongo: jest.fn().mockResolvedValue(client),
        createKafkaManager: jest.fn().mockReturnValue(kafkaManager),
        createApp: jest.fn(),
        processRef: { once: jest.fn() },
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        kafkaConfig: { enabled: true },
      }),
    ).rejects.toThrow('synthetic kafka failure');

    expect(kafkaManager.disconnect).toHaveBeenCalledTimes(1);
    expect(client.close).toHaveBeenCalledTimes(1);
  });

  test('closes every owned handle when the HTTP listener fails asynchronously', async () => {
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({ synthetic: true }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const kafkaManager = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const ingestion = {
      deps: { ready: Promise.resolve() },
      stop: jest.fn(),
    };
    const server = new EventEmitter();
    server.close = jest.fn(callback => callback());
    const app = {
      listen: jest.fn(() => {
        process.nextTick(() => server.emit('error', new Error('synthetic listen failure')));
        return server;
      }),
    };
    const processRef = { once: jest.fn(), exitCode: null };
    const { startStep1Ingestion } = require('../src/step1-ingestion');

    const startup = startStep1Ingestion({
      connectMongo: jest.fn().mockResolvedValue(client),
      createKafkaManager: jest.fn().mockReturnValue(kafkaManager),
      createApp: jest.fn().mockReturnValue({ app, ingestion }),
      processRef,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      kafkaConfig: { enabled: true },
    });

    await expect(startup).rejects.toThrow('synthetic listen failure');
    expect(ingestion.stop).toHaveBeenCalledTimes(1);
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(kafkaManager.disconnect).toHaveBeenCalledTimes(1);
    expect(client.close).toHaveBeenCalledTimes(1);
    expect(processRef.once).not.toHaveBeenCalled();
  });
});
