'use strict';

const RequestQueue = require('kafkajs/src/network/requestQueue');

function requestQueue() {
  return new RequestQueue({
    maxInFlightRequests: null,
    requestTimeout: 30000,
    enforceRequestTimeout: false,
    clientId: 'synthetic-test-client',
    broker: 'synthetic-test-broker',
    logger: { debug: jest.fn() },
  });
}

describe('KafkaJS empty request queue patch', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('does not schedule timer churn after checking an empty queue', () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const queue = requestQueue();

    queue.checkPendingRequests();

    expect(timeoutSpy).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(1000);
    expect(timeoutSpy).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('still schedules a pending request for the end of broker throttling', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const queue = requestQueue();
    queue.pending.push({ synthetic: true });
    queue.throttledUntil = Date.now() + 250;
    const checkSpy = jest
      .spyOn(queue, 'checkPendingRequests')
      .mockImplementation(() => {});

    queue.scheduleCheckPendingRequests();

    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(249);
    expect(checkSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  test('preserves KafkaManager connect and send behavior', async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const send = jest.fn().mockResolvedValue(undefined);
    const producer = { connect, send, disconnect: jest.fn() };
    const Kafka = jest
      .fn()
      .mockImplementation(() => ({ producer: () => producer }));

    jest.resetModules();
    jest.doMock('kafkajs', () => ({ Kafka }));
    const KafkaManager = require('../src/lib/kafka-manager');
    const manager = new KafkaManager({
      brokers: ['127.0.0.1:19092'],
      clientId: 'synthetic-test-client',
      securityProtocol: 'PLAINTEXT',
    });

    await manager.connect();
    await manager.send({
      topic: 'saludata.measurements.pseud.v1',
      key: 'pt_00000000000000000000000000000000',
      message: { synthetic: true },
      headers: { schema_version: 'saludata.measurement-event.v1' },
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      topic: 'saludata.measurements.pseud.v1',
      messages: [
        {
          key: 'pt_00000000000000000000000000000000',
          value: JSON.stringify({ synthetic: true }),
          headers: { schema_version: 'saludata.measurement-event.v1' },
        },
      ],
    });
    jest.dontMock('kafkajs');
    jest.resetModules();
  });
});
