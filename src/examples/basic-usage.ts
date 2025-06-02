/* eslint-disable no-console */
/**
 * Basic usage examples for the logger
 */
import { UnnboundLogger, generateUuid } from '../index';

/**
 * Demonstrates basic usage of the structured logger
 */
function basicLoggingExample(): void {
  console.log('=== Basic Logging Example ===');

  // Create a new logger instance
  const logger = new UnnboundLogger();

  // Basic logging with different levels
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  logger.debug('This is a debug message');

  // Logging with structured data
  logger.info({
    event: 'user_login',
    userId: '123',
    timestamp: new Date().toISOString(),
  });

  // Logging with workflow tracking
  const workflowId = generateUuid();
  logger.info('Starting workflow', { workflowId });
  logger.info('Processing step 1', { workflowId });
  logger.info('Processing step 2', { workflowId });
  logger.info('Workflow completed', { workflowId });

  // HTTP request/response logging
  const requestId = logger.httpRequest('POST', 'https://api.example.com/users', {
    name: 'John Doe',
    email: 'john@example.com',
  });

  // Later, when the response is received
  logger.httpResponse(
    'POST',
    'https://api.example.com/users',
    201,
    { id: '123', status: 'created' },
    { requestId, duration: 150 }
  );

  // SFTP operation logging
  logger.sftpOperation(
    'PUT',
    'sftp://example.com',
    '/uploads',
    'document.pdf',
    { duration: 250, fileSize: 1024 }
  );

  console.log('\n');
}

/**
 * Demonstrates HTTP request/response logging
 */
function httpLoggingExample(): void {
  console.log('=== HTTP Logging Example ===');

  const logger = new UnnboundLogger();
  const workflowId = generateUuid();

  // Log HTTP request
  const requestId = logger.httpRequest(
    'POST',
    'https://api.example.com/users',
    { name: 'John Doe', email: 'john@example.com' },
    { workflowId }
  );

  // Log successful HTTP response
  logger.httpResponse(
    'POST',
    'https://api.example.com/users',
    201,
    { id: '123', success: true },
    { requestId, workflowId, duration: 150 }
  );

  // Log HTTP request that will fail
  const errorRequestId = logger.httpRequest('GET', 'https://api.example.com/invalid', null, {
    workflowId,
  });

  // Log error HTTP response
  logger.httpResponse(
    'GET',
    'https://api.example.com/invalid',
    404,
    { error: 'Resource not found' },
    { requestId: errorRequestId, workflowId, duration: 90 }
  );

  console.log('\n');
}

/**
 * Demonstrates SFTP operation logging
 */
function sftpLoggingExample(): void {
  console.log('=== SFTP Logging Example ===');

  const logger = new UnnboundLogger();
  const workflowId = generateUuid();

  // Log connection to SFTP server
  logger.sftpOperation('CONNECT', 'sftp://sftp.example.com', '/', '', {
    workflowId,
    duration: 350,
  });

  // Log listing files
  logger.sftpOperation('LIST', 'sftp://sftp.example.com', '/uploads/', '', {
    workflowId,
    duration: 120,
  });

  // Log uploading a file
  logger.sftpOperation('PUT', 'sftp://sftp.example.com', '/uploads/', 'report.csv', {
    workflowId,
    duration: 2500,
    fileSize: 1024000,
  });

  console.log('\n');
}

/**
 * Demonstrates workflow tracking
 */
function workflowExample(): void {
  console.log('=== Workflow Example ===');

  const logger = new UnnboundLogger();
  const workflowId = generateUuid();

  // Start a business process
  logger.info('Order processing started', {
    workflowId,
    orderId: 'ORD-12345',
  });

  // Log API call to payment service
  const paymentRequestId = logger.httpRequest(
    'POST',
    'https://api.payments.example.com/process',
    { orderId: 'ORD-12345', amount: 99.99 },
    { workflowId }
  );

  // Log payment response
  logger.httpResponse(
    'POST',
    'https://api.payments.example.com/process',
    200,
    { transactionId: 'TXN-789', status: 'approved' },
    { requestId: paymentRequestId, workflowId, duration: 300 }
  );

  // Log fulfillment step
  logger.info('Order fulfillment initiated', {
    workflowId,
    orderId: 'ORD-12345',
    warehouseId: 'WH-5',
  });

  // Log SFTP upload of order details
  logger.sftpOperation('PUT', 'sftp://warehouse.example.com', '/orders/', 'ORD-12345.json', {
    workflowId,
    duration: 150,
    fileSize: 2048,
  });

  // Complete the workflow
  logger.info('Order processing completed successfully', {
    workflowId,
    orderId: 'ORD-12345',
    processingTime: '45s',
  });

  console.log('\n');
}

// Run the examples
(function runExamples(): void {
  basicLoggingExample();
  httpLoggingExample();
  sftpLoggingExample();
  workflowExample();
})();
