import { StructuredLogger } from '../src';

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

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new StructuredLogger();
    // @ts-expect-error - accessing private property for testing
    logSpy = jest.spyOn(logger.logger, 'log');
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
    const requestId = logger.httpRequest('GET', 'https://example.com/api', { query: 'test' });

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
        message: { query: 'test' },
      })
    );
  });

  test('should log HTTP responses', () => {
    logger.httpResponse(
      'GET',
      'https://example.com/api',
      200,
      { result: 'success' },
      {
        requestId: 'test-request-id',
        duration: 150,
      }
    );

    expect(logSpy).toHaveBeenCalledWith(
      'info',
      '',
      expect.objectContaining({
        logLevel: 'info',
        logType: 'httpResponse',
        method: 'GET',
        url: 'https://example.com/api',
        requestId: 'test-request-id',
        responseStatusCode: 200,
        message: { result: 'success' },
        duration: 150,
      })
    );
  });

  test('should log SFTP operations', () => {
    logger.sftpOperation('PUT', 'sftp://example.com', '/path/to/', 'file.txt', {
      duration: 300,
      fileSize: 1024,
    });

    expect(logSpy).toHaveBeenCalledWith(
      'info',
      '',
      expect.objectContaining({
        logLevel: 'info',
        logType: 'sftpOperation',
        method: 'PUT',
        url: 'sftp://example.com',
        filePath: '/path/to/',
        fileName: 'file.txt',
        fileSize: 1024,
        duration: 300,
      })
    );
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

  test('should set log level based on HTTP status code', () => {
    // 2xx status code should use 'info' level
    logger.httpResponse('GET', 'https://example.com/api', 200, null, { duration: 100 });
    expect(logSpy).toHaveBeenCalledWith('info', '', expect.any(Object));

    // 4xx status code should use 'warn' level
    logger.httpResponse('GET', 'https://example.com/api', 404, null, { duration: 100 });
    expect(logSpy).toHaveBeenCalledWith('warn', '', expect.any(Object));

    // 5xx status code should use 'error' level
    logger.httpResponse('GET', 'https://example.com/api', 500, null, { duration: 100 });
    expect(logSpy).toHaveBeenCalledWith('error', '', expect.any(Object));
  });
});
