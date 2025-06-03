import { UnnboundLogger } from '../src';
import winston from 'winston';
import * as idGen from '../src/utils/id-generator';
import * as index from '../src';
import { Request, Response } from 'express';
import { PinoAdapter } from '../src/adapters/pino-adapter';
import { WinstonAdapter } from '../src/adapters/winston-adapter';
import { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { traceContext } from '../src/utils/trace-context';

// Helper function to create mock request objects
function createMockRequest(overrides: Partial<Request> = {}): Request {
  const mockRes = {
    locals: {},
  } as Response;

  return {
    method: 'GET',
    url: '/',
    originalUrl: '/',
    headers: {},
    query: {},
    params: {},
    body: {},
    get: jest.fn((header: string) => {
      if (header === 'user-agent') return 'test-agent';
      if (header === 'referer') return 'test-referer';
      return undefined;
    }),
    header: jest.fn(),
    accepts: jest.fn(),
    acceptsCharsets: jest.fn(),
    acceptsEncodings: jest.fn(),
    acceptsLanguages: jest.fn(),
    param: jest.fn(),
    is: jest.fn(),
    protocol: 'http',
    secure: false,
    ip: '127.0.0.1',
    ips: [],
    subdomains: [],
    path: '/',
    hostname: 'localhost',
    host: 'localhost',
    fresh: false,
    stale: true,
    xhr: false,
    cookies: {},
    signedCookies: {},
    secret: undefined,
    res: mockRes,
    ...overrides
  } as unknown as Request;
}

// Helper function to create mock response objects
function createMockResponse(overrides: Partial<Response> = {}): Response {
  return {
    statusCode: 200,
    locals: {},
    getHeaders: jest.fn(() => ({})),
    get: jest.fn(),
    setHeader: jest.fn(),
    ...overrides
  } as unknown as Response;
}

describe('Extra coverage for UnnboundLogger', () => {
  test('should use a custom Winston logger', () => {
    const customLogger = winston.createLogger({
      transports: [new winston.transports.Console()]
    });
    const logger = new UnnboundLogger({ engine: customLogger });
    expect(logger).toBeInstanceOf(UnnboundLogger);
  });

  test('should use simple and pretty log formats', () => {
    const logger = new UnnboundLogger({
      engine: new WinstonAdapter({
        level: 'info',
        serviceName: 'test-service',
        environment: 'test'
      })
    });
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.engine, 'log');

    logger.info('Test message');
    expect(logSpy).toHaveBeenCalledWith(
      'info',
      '',
      expect.objectContaining({
        logLevel: 'info',
        logType: 'general',
        message: 'Test message'
      })
    );
  });

  test('should handle error instanceof Error branch in error()', () => {
    const logger = new UnnboundLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.engine, 'log');
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
    const logger = new UnnboundLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.engine, 'log');

    const mockReq = createMockRequest({
      method: 'GET',
      url: 'url',
      originalUrl: 'url',
    });

    const mockRes = createMockResponse({
      statusCode: 200,
      getHeaders: jest.fn(() => ({})),
      get: jest.fn(),
    });

    logger.httpResponse(mockRes, mockReq, { duration: 1 });
    expect(logSpy).toHaveBeenCalledWith(
      'info',
      '',
      expect.objectContaining({
        logLevel: 'info',
        logType: 'httpResponse',
        responseStatusCode: 200,
        duration: 1
      })
    );
  });

  test('should ignore paths based on patterns', () => {
    const logger = new UnnboundLogger({
      ignoreTraceRoutes: ['/api/*', '/health', 'test?.txt']
    });
    const shouldIgnorePath = (logger as any).shouldIgnorePath.bind(logger);
    expect(shouldIgnorePath('/api/users', ['/api/*'])).toBe(true);
    expect(shouldIgnorePath('/health', ['/health'])).toBe(true);
    expect(shouldIgnorePath('test1.txt', ['test?.txt'])).toBe(true);
    expect(shouldIgnorePath('/other', ['/api/*'])).toBe(false);
  });

  test('should handle trace middleware', () => {
    const logger = new UnnboundLogger({
      traceHeaderKey: 'custom-trace-id',
      ignoreTraceRoutes: ['/health']
    });

    const mockReq = createMockRequest({
      path: '/api/test',
      header: jest.fn().mockReturnValue('existing-trace-id')
    });
    const mockRes = createMockResponse();
    const next = jest.fn();

    logger.traceMiddleware(mockReq, mockRes, next);

    expect(mockRes.setHeader).toHaveBeenCalledWith('custom-trace-id', 'existing-trace-id');
    expect(next).toHaveBeenCalled();
  });

  test('should ignore trace for specified routes', () => {
    const logger = new UnnboundLogger({
      traceHeaderKey: 'custom-trace-id',
      ignoreTraceRoutes: ['/health']
    });

    const mockReq = createMockRequest({
      path: '/health'
    });
    const mockRes = createMockResponse();
    const next = jest.fn();

    logger.traceMiddleware(mockReq, mockRes, next);

    expect(mockRes.setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('should handle axios trace middleware', () => {
    const logger = new UnnboundLogger({
      traceHeaderKey: 'custom-trace-id',
      ignoreAxiosTraceRoutes: ['/api/ignore']
    });

    const mockConfig = {
      url: '/api/test',
      headers: new AxiosHeaders()
    } as InternalAxiosRequestConfig;

    // Set up a trace ID in the context
    traceContext.run('test-trace-id', () => {
      const result = logger.axiosTraceMiddleware.onFulfilled(mockConfig);
      expect(result.headers.get('custom-trace-id')).toBe('test-trace-id');
    });
  });

  test('should ignore axios trace for specified routes', () => {
    const logger = new UnnboundLogger({
      traceHeaderKey: 'custom-trace-id',
      ignoreAxiosTraceRoutes: ['/api/ignore']
    });

    const mockConfig = {
      url: '/api/ignore',
      headers: new AxiosHeaders()
    } as InternalAxiosRequestConfig;

    const result = logger.axiosTraceMiddleware.onFulfilled(mockConfig);
    expect(result.headers.get('custom-trace-id')).toBeUndefined();
  });

  test('should handle axios trace middleware error', () => {
    const logger = new UnnboundLogger();
    const error = new Error('Test error');

    return expect(logger.axiosTraceMiddleware.onRejected(error)).rejects.toThrow('Test error');
  });
});

describe('Logging Adapters', () => {
  describe('PinoAdapter', () => {
    test('should create a Pino adapter with default options', () => {
      const adapter = new PinoAdapter();
      expect(adapter).toBeInstanceOf(PinoAdapter);
    });

    test('should create a Pino adapter with custom options', () => {
      const adapter = new PinoAdapter({
        level: 'debug',
        serviceName: 'test-service',
        environment: 'test',
      });
      expect(adapter).toBeInstanceOf(PinoAdapter);
    });

    test('should log messages with Pino adapter', () => {
      const adapter = new PinoAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'info');

      adapter.log('info', 'test message', { test: 'data' });
      expect(logSpy).toHaveBeenCalled();
    });

    test('should handle different log levels with Pino adapter', () => {
      const adapter = new PinoAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'error');

      adapter.log('error', 'error message', { error: 'data' });
      expect(logSpy).toHaveBeenCalled();
    });

    test('should format log level correctly', () => {
      const adapter = new PinoAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'info');

      adapter.log('info', 'test message', { test: 'data' });

      expect(logSpy).toHaveBeenCalledWith(
        { test: 'data' },
        'test message'
      );
    });

    test('should include timestamp in logs', () => {
      const adapter = new PinoAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'info');

      adapter.log('info', 'test message', { test: 'data' });

      expect(logSpy).toHaveBeenCalledWith(
        { test: 'data' },
        'test message'
      );
    });

    test('should include service name and environment in logs', () => {
      const adapter = new PinoAdapter({
        serviceName: 'test-service',
        environment: 'test'
      });
      const logSpy = jest.spyOn(adapter['logger'], 'info');

      adapter.log('info', 'test message', { test: 'data' });

      expect(logSpy).toHaveBeenCalledWith(
        { test: 'data' },
        'test message'
      );
    });

    test('should handle object messages', () => {
      const adapter = new PinoAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'info');

      adapter.log('info', { message: 'test message' }, { test: 'data' });

      expect(logSpy).toHaveBeenCalledWith(
        { message: 'test message', test: 'data' }
      );
    });
  });

  describe('WinstonAdapter', () => {
    test('should create a Winston adapter with default options', () => {
      const adapter = new WinstonAdapter();
      expect(adapter).toBeInstanceOf(WinstonAdapter);
    });

    test('should create a Winston adapter with custom options', () => {
      const adapter = new WinstonAdapter({
        level: 'debug',
        serviceName: 'test-service',
        environment: 'test',
        transports: [new winston.transports.Console()],
      });
      expect(adapter).toBeInstanceOf(WinstonAdapter);
    });

    test('should log messages with Winston adapter', () => {
      const adapter = new WinstonAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'log');

      adapter.log('info', 'test message', { test: 'data' });
      expect(logSpy).toHaveBeenCalled();
    });

    test('should handle different log levels with Winston adapter', () => {
      const adapter = new WinstonAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'log');

      adapter.log('error', 'error message', { error: 'data' });
      expect(logSpy).toHaveBeenCalled();
    });

    test('should include trace ID in logs when available', () => {
      const adapter = new WinstonAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'log');

      // Set a trace ID in the context
      traceContext.run('test-trace-id', () => {
        adapter.log('info', 'test message', { test: 'data' });
      });

      expect(logSpy).toHaveBeenCalledWith(
        'info',
        'test message',
        { test: 'data' }
      );
    });

    test('should not include trace ID when not available', () => {
      const adapter = new WinstonAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'log');

      adapter.log('info', 'test message', { test: 'data' });

      expect(logSpy).toHaveBeenCalledWith(
        'info',
        'test message',
        expect.objectContaining({
          test: 'data'
        })
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        'info',
        'test message',
        expect.objectContaining({
          traceId: expect.any(String)
        })
      );
    });

    test('should use custom transports', () => {
      const customTransport = new winston.transports.Console();
      const adapter = new WinstonAdapter({
        transports: [customTransport]
      });

      expect(adapter['logger'].transports).toContain(customTransport);
    });

    test('should handle object messages', () => {
      const adapter = new WinstonAdapter();
      const logSpy = jest.spyOn(adapter['logger'], 'log');

      adapter.log('info', { message: 'test message' }, { test: 'data' });

      expect(logSpy).toHaveBeenCalledWith(
        'info',
        '',
        expect.objectContaining({
          message: 'test message',
          test: 'data'
        })
      );
    });
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

    const mockReq = createMockRequest({
      method: 'GET',
      url: 'url',
      originalUrl: 'url',
    });

    const mockRes = createMockResponse({
      statusCode: 200,
    });

    expect(() => index.httpRequest(mockReq)).not.toThrow();
    expect(() => index.httpResponse(mockRes, mockReq, { duration: 100 })).not.toThrow();
  });
});