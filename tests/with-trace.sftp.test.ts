import { UnnboundLogger } from '../src/unnbound-logger';
import { withTrace } from '../src/utils/with-trace';
import { traceContext } from '../src/utils/trace-context';

describe('withTrace Example', () => {
  let logger: UnnboundLogger;

  beforeEach(() => {
    // Initialize logger with test configuration
    logger = new UnnboundLogger({
      defaultLevel: 'debug',
      serviceName: 'test-service',
      environment: 'test'
    });
  });

  it('should maintain trace context throughout function execution', () => {
    const operation = (value: number) => {
      const currentTraceId = traceContext.getTraceId();
      logger.info('Inside operation', { value, traceId: currentTraceId });
      return value * 2;
    };

    const tracedOperation = withTrace(operation);
    const result = tracedOperation(21);

    expect(result).toBe(42);
  });

  it('should use provided trace ID when specified', () => {
    const customTraceId = 'custom-trace-123';
    const operation = () => {
      const currentTraceId = traceContext.getTraceId();
      logger.info('Inside operation', { traceId: currentTraceId });
      return currentTraceId;
    };

    const tracedOperation = withTrace(operation, customTraceId);
    const result = tracedOperation();

    expect(result).toBe(customTraceId);
  });

  it('should maintain trace context across async operations', async () => {
    const asyncOperation = async (value: number) => {
      const traceId1 = traceContext.getTraceId();
      logger.info('First async step', { traceId: traceId1 });

      await new Promise(resolve => setTimeout(resolve, 10));

      const traceId2 = traceContext.getTraceId();
      logger.info('Second async step', { traceId: traceId2 });

      return { value, traceId1, traceId2 };
    };

    const tracedOperation = withTrace(asyncOperation);
    const result = await tracedOperation(42);

    expect(result.traceId1).toBe(result.traceId2);
    expect(result.value).toBe(42);
  });

  it('should maintain separate trace contexts for different operations', () => {
    const operation1 = () => traceContext.getTraceId();
    const operation2 = () => traceContext.getTraceId();

    const tracedOperation1 = withTrace(operation1);
    const tracedOperation2 = withTrace(operation2);

    const traceId1 = tracedOperation1();
    const traceId2 = tracedOperation2();

    expect(traceId1).not.toBe(traceId2);
  });
});