import { UnnboundLogger } from '../src';
import * as idGen from '../src/utils/logger-utils';
import * as index from '../src';
import { Request, Response } from 'express';
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
    on: jest.fn((event: string, callback: () => void) => {
      // Simulate the 'finish' event for testing
      if (event === 'finish') {
        // Call the callback immediately for testing purposes
        setTimeout(callback, 0);
      }
    }),
    send: jest.fn(function(this: any, body: any) {
      this.locals.body = body;
      return this;
    }),
    ...overrides
  } as unknown as Response;
}

describe('Extra coverage for UnnboundLogger', () => {
  test('should create logger with custom options', () => {
    const logger = new UnnboundLogger({
      defaultLevel: 'debug',
      serviceName: 'test-service',
      environment: 'test'
    });
    expect(logger).toBeInstanceOf(UnnboundLogger);
  });

  test('should handle error instanceof Error branch in error()', () => {
    const logger = new UnnboundLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.logger, 'error');
    const err = new Error('Branch error');
    logger.error(err);
    expect(logSpy).toHaveBeenCalled();
  });

  test('should use info level in httpResponse if no status code triggers warn/error', () => {
    const logger = new UnnboundLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.logger, 'info');

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
    expect(logSpy).toHaveBeenCalled();
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

  test('should handle trace middleware', async () => {
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
    
    // Wait a bit for the async callback to execute
    await new Promise(resolve => setTimeout(resolve, 10));
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

  test('should log SFTP transactions', () => {
    const logger = new UnnboundLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.logger, 'info');

    logger.sftpTransaction({
      host: 'example.com',
      username: 'testuser',
      operation: 'upload',
      path: '/test/file.txt',
      status: 'success',
      bytesTransferred: 1024
    });

    expect(logSpy).toHaveBeenCalled();
    const logCall = logSpy.mock.calls[0];
    expect(logCall[0]).toMatchObject({
      type: 'sftpTransaction',
      message: 'SFTP upload success - /test/file.txt',
      sftp: {
        host: 'example.com',
        username: 'testuser',
        operation: 'upload',
        path: '/test/file.txt',
        status: 'success',
        bytesTransferred: 1024
      }
    });
  });

  test('should log database query transactions', () => {
    const logger = new UnnboundLogger();
    // @ts-expect-error: access private property for test
    const logSpy = jest.spyOn(logger.logger, 'info');

    logger.dbQueryTransaction({
      instance: 'localhost:5432',
      vendor: 'postgres',
      query: 'SELECT * FROM users',
      status: 'success',
      rowsReturned: 10
    });

    expect(logSpy).toHaveBeenCalled();
    const logCall = logSpy.mock.calls[0];
    expect(logCall[0]).toMatchObject({
      type: 'dbQueryTransaction',
      message: 'DB Query success - postgres',
      db: {
        instance: 'localhost:5432',
        vendor: 'postgres',
        query: 'SELECT * FROM users',
        status: 'success',
        rowsReturned: 10
      }
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