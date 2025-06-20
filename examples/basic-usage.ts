/* eslint-disable no-console */
/**
 * Basic usage examples for the logger with new log format
 */
import { UnnboundLogger } from '../src/index';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Demonstrates basic usage of the structured logger with new format
 */
function basicLoggingExample(): void {
  console.log('=== Basic Logging Example ===');

  // Create a new logger instance
  // The deploymentId will be automatically populated from UNNBOUND_DEPLOYMENT_ID environment variable
  // The workflowId will be automatically populated from UNNBOUND_WORKFLOW_ID environment variable
  const logger = new UnnboundLogger();

  // Basic logging with different levels
  // Each log will include deploymentId automatically
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  logger.debug('This is a debug message');

  // Logging with Error objects
  const error = new Error('Sample error for demonstration');
  logger.error(error);

  // Logging with structured data
  logger.info('User login event', {
    userId: '123',
    timestamp: new Date().toISOString(),
  });

  console.log('\n');
}

/**
 * Demonstrates HTTP request/response logging with new format
 */
function httpLoggingExample(): void {
  console.log('=== HTTP Logging Example ===');

  const logger = new UnnboundLogger();

  // Log HTTP request
  const mockReq = {
    method: 'POST',
    url: 'https://api.example.com/users',
    originalUrl: 'https://api.example.com/users',
    body: { name: 'John Doe', email: 'john@example.com' },
    headers: { 'content-type': 'application/json' },
    ip: '192.168.1.100',
  } as Request;

  const mockRes = {
    statusCode: 201,
    locals: {},
    getHeaders: () => ({ 'content-type': 'application/json' }),
    get: () => undefined,
  } as unknown as Response;

  const reqLog = logger.httpRequest(mockReq);
  logger.httpResponse(mockRes, mockReq, { requestId: reqLog.requestId, duration: 150 });

  // Log HTTP request that will fail
  const errorReq = {
    method: 'GET',
    url: 'https://api.example.com/invalid',
    originalUrl: 'https://api.example.com/invalid',
    headers: {},
    ip: '192.168.1.100',
  } as Request;

  const errorRes = {
    statusCode: 404,
    locals: {},
    getHeaders: () => ({}),
    get: () => undefined,
  } as unknown as Response;

  const errorReqLog = logger.httpRequest(errorReq);
  logger.httpResponse(errorRes, errorReq, { requestId: errorReqLog.requestId, duration: 90 });

  console.log('\n');
}

/**
 * Demonstrates SFTP transaction logging
 */
function sftpLoggingExample(): void {
  console.log('=== SFTP Transaction Example ===');

  const logger = new UnnboundLogger();

  // Log successful SFTP upload
  logger.sftpTransaction({
    host: 'sftp.example.com',
    username: 'ftpuser',
    operation: 'upload',
    path: '/uploads/document.pdf',
    status: 'success',
    bytesTransferred: 2048576 // 2MB
  });

  // Log failed SFTP download
  logger.sftpTransaction({
    host: 'sftp.example.com',
    username: 'ftpuser',
    operation: 'download',
    path: '/downloads/missing-file.txt',
    status: 'failure'
  }, {
    startTime: Date.now() - 5000 // Started 5 seconds ago
  });

  // Log SFTP list operation
  logger.sftpTransaction({
    host: 'sftp.example.com',
    username: 'ftpuser',
    operation: 'list',
    path: '/incoming',
    status: 'success',
    filesListed: 15
  });

  console.log('\n');
}

/**
 * Demonstrates database query transaction logging
 */
function dbLoggingExample(): void {
  console.log('=== Database Query Transaction Example ===');

  const logger = new UnnboundLogger();

  // Log successful SELECT query
  logger.dbQueryTransaction({
    instance: 'prod-postgres-01:5432',
    vendor: 'postgres',
    query: 'SELECT * FROM users WHERE active = true',
    status: 'success',
    rowsReturned: 250
  });

  // Log successful UPDATE query
  logger.dbQueryTransaction({
    instance: 'prod-postgres-01:5432',
    vendor: 'postgres',
    query: 'UPDATE users SET last_login = NOW() WHERE id = $1',
    status: 'success',
    rowsAffected: 1
  }, {
    duration: 45 // Query took 45ms
  });

  // Log failed query
  logger.dbQueryTransaction({
    instance: 'prod-mysql-cluster',
    vendor: 'mysql',
    query: 'SELECT * FROM non_existent_table',
    status: 'failure',
    rowsReturned: 0
  });

  console.log('\n');
}

/**
 * Demonstrates trace ID consistency
 */
function traceExample(): void {
  console.log('=== Trace ID Example ===');

  const logger = new UnnboundLogger();
  const customTraceId = uuidv4();

  // All logs with the same trace ID
  logger.info('Order processing started', {
    traceId: customTraceId,
    orderId: 'ORD-12345',
  });

  // Log API call to payment service
  const paymentReq = {
    method: 'POST',
    url: 'https://api.payments.example.com/process',
    originalUrl: 'https://api.payments.example.com/process',
    body: { orderId: 'ORD-12345', amount: 99.99 },
    headers: { 'content-type': 'application/json' },
    ip: '10.0.1.50',
  } as Request;

  const paymentRes = {
    statusCode: 200,
    locals: {},
    getHeaders: () => ({ 'content-type': 'application/json' }),
    get: () => undefined,
  } as unknown as Response;

  const paymentReqLog = logger.httpRequest(paymentReq, { traceId: customTraceId });
  logger.httpResponse(paymentRes, paymentReq, {
    requestId: paymentReqLog.requestId,
    traceId: customTraceId,
    duration: 300
  });

  // Log database operation
  logger.dbQueryTransaction({
    instance: 'orders-db:5432',
    vendor: 'postgres',
    query: 'UPDATE orders SET status = $1 WHERE id = $2',
    status: 'success',
    rowsAffected: 1
  }, {
    traceId: customTraceId
  });

  // Complete the workflow
  logger.info('Order processing completed successfully', {
    traceId: customTraceId,
    orderId: 'ORD-12345',
    processingTime: '2.1s',
  });

  console.log('\n');
}

// Run the examples
(function runExamples(): void {
  basicLoggingExample();
  httpLoggingExample();
  sftpLoggingExample();
  dbLoggingExample();
  traceExample();
})();
