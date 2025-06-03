import { UnnboundLogger } from '../src';
import winston from 'winston';
import * as idGen from '../src/utils/id-generator';
import { Request, Response } from 'express';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// Mock Date to return predictable timestamps
const mockDate = new Date('2025-01-01T12:00:00.000Z');
const MockDate = jest.fn(() => mockDate) as unknown as typeof Date;
MockDate.now = jest.fn(() => mockDate.getTime());
MockDate.parse = jest.fn((date: string) => new Date(date).getTime());
MockDate.UTC = jest.fn((a, b, c, d, e, f, g) =>
  new Date(Date.UTC(a, b, c, d, e, f, g)).getTime()
);
MockDate.prototype.toISOString = jest.fn(() => '2025-01-01T12:00:00.000Z');
global.Date = MockDate;

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
    ...overrides
  } as unknown as Response;
}

describe('UnnboundLogger', () => {
  let logger: UnnboundLogger;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new UnnboundLogger();
    // @ts-expect-error - accessing private property for testing
    logSpy = jest.spyOn(logger.engine, 'log');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should log general messages', () => {
    logger.info('Test message');

    expect(logSpy).toHaveBeenCalledWith(
      'info',
      '',
      expect.objectContaining({
        logId: 'test-uuid',
        timestamp: '2025-01-01T12:00:00.000Z',
        traceId: 'test-uuid',
        workflowId: 'test-uuid',
        logLevel: 'info',
        logType: 'general',
        message: 'Test message',
        method: null,
        url: null,
        requestId: null,
        responseStatusCode: null,
        filePath: null,
        fileName: null,
        fileSize: null,
        duration: null,
      })
    );
  });

  test('should log errors', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.ts:10:20';

    logger.error(error);

    expect(logSpy).toHaveBeenCalledWith(
      'error',
      '',
      expect.objectContaining({
        logLevel: 'error',
        logType: 'general',
        message: {
          message: 'Test error',
          stack: 'Error: Test error\n    at test.ts:10:20',
          name: 'Error',
        },
      })
    );
  });

  test('should log HTTP requests', () => {
    const mockReq = createMockRequest({
      method: 'GET',
      url: 'https://example.com/api',
      originalUrl: 'https://example.com/api',
      query: { test: 'test' },
    });

    const requestId = logger.httpRequest(mockReq);

    expect(requestId).toBe('test-uuid');
    expect(logSpy).toHaveBeenCalledWith(
      'info',
      '',
      expect.objectContaining({
        logLevel: 'info',
        logType: 'httpRequest',
        method: 'GET',
        url: 'https://example.com/api',
        requestId: 'test-uuid',
        message: expect.objectContaining({
          query: { test: 'test' }
        }),
      })
    );
  });

  describe('HTTP Response Logging', () => {
    test('should log HTTP responses', () => {
      const mockReq = createMockRequest({
        method: 'GET',
        url: 'https://example.com/api',
        originalUrl: 'https://example.com/api',
      });

      const mockRes = createMockResponse({
        statusCode: 200,
        getHeaders: jest.fn(() => ({})),
        get: jest.fn(),
      });

      logger.httpResponse(mockRes, mockReq, { duration: 100 });
      expect(logSpy).toHaveBeenCalledWith(
        'info',
        '',
        expect.objectContaining({
          logLevel: 'info',
          logType: 'httpResponse',
          responseStatusCode: 200,
          duration: 100
        })
      );
    });

    test('should set log level based on HTTP status code', () => {
      const mockReq = createMockRequest({
        method: 'GET',
        url: 'https://example.com/api',
        originalUrl: 'https://example.com/api',
      });

      const mockRes = createMockResponse({
        statusCode: 500,
        getHeaders: jest.fn(() => ({})),
        get: jest.fn(),
      });

      logger.httpResponse(mockRes, mockReq, { duration: 100 });
      expect(logSpy).toHaveBeenCalledWith(
        'error',
        '',
        expect.objectContaining({
          logLevel: 'error',
          logType: 'httpResponse',
          responseStatusCode: 500,
          duration: 100
        })
      );
    });
  });

  test('should use workflow IDs for tracing', () => {
    const workflowId = 'workflow-123';

    logger.info('Start workflow', { workflowId });
    logger.warn('Warning in workflow', { workflowId });

    expect(logSpy).toHaveBeenCalledTimes(2);
    const calls = logSpy.mock.calls as Array<[string, string, Record<string, unknown>]>;
    expect(calls[0][2]).toMatchObject({
      workflowId: 'workflow-123',
      traceId: 'test-uuid', // The traceId should be consistent
    });
    expect(calls[1][2]).toMatchObject({
      workflowId: 'workflow-123',
      traceId: 'test-uuid', // The same traceId should be used
    });
  });
});
