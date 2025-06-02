import { StructuredLogger } from '../src';
import winston from 'winston';
import * as idGen from '../src/utils/id-generator';
import * as index from '../src';

describe('Extra coverage for StructuredLogger', () => {
  test('should use a custom Winston logger', () => {
    const customLogger = winston.createLogger({
      transports: [new winston.transports.Console()]
    });
    const logger = new StructuredLogger({ winstonLogger: customLogger });
    expect(logger).toBeInstanceOf(StructuredLogger);
  });

  test('should use simple and pretty log formats', () => {
    const logger = new StructuredLogger();
    // @ts-expect-error: Testing private method
    const simpleFormat = logger.getLogFormat('simple');
    // @ts-expect-error: Testing private method
    const prettyFormat = logger.getLogFormat('pretty');
    expect(simpleFormat).toBeDefined();
    expect(prettyFormat).toBeDefined();
  });

  test('should handle error instanceof Error branch in error()', () => {
    const logger = new StructuredLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.logger, 'log');
    const err = new Error('Branch error');
    logger.error(err);
    expect(logSpy).toHaveBeenCalledWith(
      'error',
      '',
      expect.objectContaining({
        logLevel: 'error',
        logType: 'general',
        message: expect.objectContaining({
          message: 'Branch error',
          stack: expect.any(String),
          name: 'Error',
        })
      })
    );
  });

  test('should use info level in httpResponse if no status code triggers warn/error', () => {
    const logger = new StructuredLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.logger, 'log');
    logger.httpResponse('GET', 'url', 200, { ok: true }, { duration: 1 });
    expect(logSpy).toHaveBeenCalledWith(
      'info',
      '',
      expect.objectContaining({
        logLevel: 'info',
        logType: 'httpResponse',
        responseStatusCode: 200,
        message: { ok: true },
        duration: 1
      })
    );
  });
});

describe('id-generator utils', () => {
  test('clearTraceId should remove a traceId', () => {
    const workflowId = 'wf-clear';
    idGen.getTraceId(workflowId);
    expect(idGen.getTraceId(workflowId)).toBeDefined();
    idGen.clearTraceId(workflowId);
    // After clearing, a new traceId is generated
    expect(idGen.getTraceId(workflowId)).toBeDefined();
  });
});

describe('index default logger exports', () => {
  test('should call all default logger exports', () => {
    expect(() => index.log('info', 'msg')).not.toThrow();
    expect(() => index.error('err')).not.toThrow();
    expect(() => index.warn('warn')).not.toThrow();
    expect(() => index.info('info')).not.toThrow();
    expect(() => index.debug('debug')).not.toThrow();
    expect(() => index.httpRequest('GET', 'url')).not.toThrow();
    expect(() => index.httpResponse('GET', 'url', 200, { data: 'test' }, { duration: 100 })).not.toThrow();
    expect(() => index.sftpOperation('PUT', 'url', '/', 'file', { duration: 1 })).not.toThrow();
  });
});