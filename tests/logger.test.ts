import { UnnboundLogger } from '../src';
import * as idGen from '../src/utils/logger-utils';
import { Request, Response } from 'express';
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// Mock Date to return predictable timestamps
const mockDate = new Date('2025-01-01T12:00:00.000Z');
const MockDate = jest.fn(() => mockDate) as unknown as typeof Date;
MockDate.now = jest.fn(() => mockDate.getTime());
MockDate.parse = jest.fn((date: string) => new Date(date).getTime());
MockDate.UTC = jest.fn((a: number, b: number, c?: number, d?: number, e?: number, f?: number, g?: number) =>
  new Date(Date.UTC(a, b, c, d, e, f, g)).getTime()
);
// Note: No longer mocking toISOString since timestamps are handled by CloudWatch
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
    }) as any,
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
    get: jest.fn().mockReturnValue(undefined) as any,
    ...overrides
  } as unknown as Response;
}

describe('UnnboundLogger', () => {
  let logger: UnnboundLogger;
  let logSpy: any;

  beforeEach(() => {
    logger = new UnnboundLogger();
    // @ts-expect-error - accessing private property for testing
    logSpy = jest.spyOn(logger.logger, 'info');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should log general messages', () => {
    logger.info('Test message');

    expect(logSpy).toHaveBeenCalled();
    const logCall = logSpy.mock.calls[0];
    expect(logCall[0]).toMatchObject({
      logId: 'test-uuid',
      type: 'general',
      workflowId: '',
      traceId: 'test-uuid',
      requestId: 'test-uuid',
      deploymentId: '',
    });
    expect(logCall[1]).toBe('Test message');
  });

  test('should log errors', () => {
    const errorSpy = jest.spyOn(logger['logger'], 'error');
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.ts:10:20';

    logger.error(error);

    expect(errorSpy).toHaveBeenCalled();
    const logCall = errorSpy.mock.calls[0];
    expect(logCall[0]).toMatchObject({
      logId: 'test-uuid',
      type: 'general',
      workflowId: '',
      deploymentId: '',
      error: {
        name: 'Error',
        message: 'Test error',
        stack: 'Error: Test error\n    at test.ts:10:20',
      },
    });
    expect(logCall[1]).toBe('Error');
  });

  test('should log HTTP requests', () => {
    const mockReq = createMockRequest({
      method: 'GET',
      url: 'https://example.com/api',
      originalUrl: 'https://example.com/api',
      query: { test: 'test' },
    });

    const httpRequestLog = logger.httpRequest(mockReq);

    expect(httpRequestLog.requestId).toBe('test-uuid');
    expect(logSpy).toHaveBeenCalled();
    const logCall = logSpy.mock.calls[0];
    expect(logCall[0]).toMatchObject({
      logId: 'test-uuid',
      type: 'httpRequest',
      workflowId: '',
      requestId: 'test-uuid',
      deploymentId: '',
      duration: 0,
      httpRequest: {
        url: 'https://example.com/api',
        method: 'GET',
        ip: '127.0.0.1',
        body: {},
      },
    });
    expect(logCall[1]).toBe('Incoming HTTP Request');
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
        get: jest.fn().mockReturnValue(undefined) as any,
      });

      logger.httpResponse(mockRes, mockReq, { duration: 100 });
      expect(logSpy).toHaveBeenCalled();
      const logCall = logSpy.mock.calls[0];
      expect(logCall[0]).toMatchObject({
        logId: 'test-uuid',
        type: 'httpResponse',
        workflowId: '',
        deploymentId: '',
        duration: 100,
        httpResponse: {
          status: 200,
        },
      });
      expect(logCall[1]).toBe('200 OK - The request is OK');
    });

    test('should set log level based on HTTP status code', () => {
      const errorSpy = jest.spyOn(logger['logger'], 'error');
      const mockReq = createMockRequest({
        method: 'GET',
        url: 'https://example.com/api',
        originalUrl: 'https://example.com/api',
      });

      const mockRes = createMockResponse({
        statusCode: 500,
        getHeaders: jest.fn(() => ({})),
        get: jest.fn().mockReturnValue(undefined) as any,
      });

      logger.httpResponse(mockRes, mockReq, { duration: 100 });
      expect(errorSpy).toHaveBeenCalled();
      const logCall = errorSpy.mock.calls[0];
      expect(logCall[0]).toMatchObject({
        logId: 'test-uuid',
        type: 'httpResponse',
        workflowId: '',
        deploymentId: '',
        duration: 100,
        httpResponse: {
          status: 500,
        },
      });
      expect(logCall[1]).toBe('500 Internal Server Error - A generic error message, given when no more specific message is suitable');
    });
  });

  test('should use trace IDs for tracing', () => {
    const warnSpy = jest.spyOn(logger['logger'], 'warn');

    logger.info('Start workflow', { traceId: 'custom-trace-123' });
    logger.warn('Warning in workflow', { traceId: 'custom-trace-123' });

    expect(logSpy).toHaveBeenCalledTimes(1); // Only info calls this spy
    const infoCall = logSpy.mock.calls[0];
    expect(infoCall[0]).toMatchObject({
      traceId: 'custom-trace-123',
    });

    // Check warn call separately
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warnCall = warnSpy.mock.calls[0];
    expect(warnCall[0]).toMatchObject({
      traceId: 'custom-trace-123',
    });
  });

  test('should include workflowId from environment variable', () => {
    // Mock environment variable
    process.env.UNNBOUND_WORKFLOW_ID = 'test-workflow-123';
    
    // Create new logger to pick up environment variable
    const workflowLogger = new UnnboundLogger();
    const workflowLogSpy = jest.spyOn(workflowLogger['logger'], 'info');

    workflowLogger.info('Workflow step');

    expect(workflowLogSpy).toHaveBeenCalled();
    const logCall = workflowLogSpy.mock.calls[0];
    expect(logCall[0]).toMatchObject({
      workflowId: 'test-workflow-123',
    });
    expect(logCall[1]).toBe('Workflow step');

    // Cleanup
    delete process.env.UNNBOUND_WORKFLOW_ID;
  });
});
