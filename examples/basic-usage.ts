/* eslint-disable no-console */
/**
 * Basic usage examples for the logger
 */
import { UnnboundLogger, generateUuid } from '../src/index';
import { Request, Response } from 'express';

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
  const mockReq = {
    method: 'POST',
    url: 'https://api.example.com/users',
    body: { name: 'John Doe', email: 'john@example.com' },
  } as Request;

  const mockRes = {
    statusCode: 201,
    locals: {},
  } as Response;

  const requestId = logger.httpRequest(mockReq);
  logger.httpResponse(mockRes, mockReq, { requestId, duration: 150 });

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
  const mockReq = {
    method: 'POST',
    url: 'https://api.example.com/users',
    body: { name: 'John Doe', email: 'john@example.com' },
  } as Request;

  const mockRes = {
    statusCode: 201,
    locals: {},
  } as Response;

  const requestId = logger.httpRequest(mockReq, { workflowId });
  logger.httpResponse(mockRes, mockReq, { requestId, workflowId, duration: 150 });

  // Log HTTP request that will fail
  const errorReq = {
    method: 'GET',
    url: 'https://api.example.com/invalid',
  } as Request;

  const errorRes = {
    statusCode: 404,
    locals: {},
  } as Response;

  const errorRequestId = logger.httpRequest(errorReq, { workflowId });
  logger.httpResponse(errorRes, errorReq, { requestId: errorRequestId, workflowId, duration: 90 });

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
  const paymentReq = {
    method: 'POST',
    url: 'https://api.payments.example.com/process',
    body: { orderId: 'ORD-12345', amount: 99.99 },
  } as Request;

  const paymentRes = {
    statusCode: 200,
    locals: {},
  } as Response;

  const paymentRequestId = logger.httpRequest(paymentReq, { workflowId });
  logger.httpResponse(paymentRes, paymentReq, { requestId: paymentRequestId, workflowId, duration: 300 });

  // Log fulfillment step
  logger.info('Order fulfillment initiated', {
    workflowId,
    orderId: 'ORD-12345',
    warehouseId: 'WH-5',
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
  workflowExample();
})();
