/* eslint-disable no-console */
/**
 * Custom configuration examples for unnbound-logger
 */
import { UnnboundLogger } from '../index';
import winston from 'winston';

/**
 * Demonstrates custom logger configuration
 */
function customConfigurationExample(): void {
  console.log('=== Custom Configuration Example ===');

  // Example 1: Custom log level
  const logger = new UnnboundLogger({
    defaultLevel: 'debug', // Set default level to debug
  });

  // Example 2: Custom Winston logger
  const customLogger = new UnnboundLogger({
    winstonLogger: winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    }),
  });

  // Example 3: Custom format
  const prettyLogger = new UnnboundLogger({
    format: 'pretty', // Use pretty-printed format
    serviceName: 'my-service',
    environment: 'development',
  });

  // Log with custom configuration
  logger.info('Application started with custom configuration');
  logger.debug({
    appVersion: '1.2.3',
    nodeEnv: 'development',
  });

  console.log('\n');
}

/**
 * Demonstrates JSON output format
 */
function jsonFormatExample(): void {
  console.log('=== JSON Format Example ===');

  const logger = new UnnboundLogger({
    format: 'json',
  });

  logger.info('This will be formatted as JSON');

  console.log('\n');
}

/**
 * Demonstrates simple text format
 */
function simpleFormatExample(): void {
  console.log('=== Simple Format Example ===');

  const logger = new UnnboundLogger({
    format: 'simple',
  });

  logger.info('This will be formatted in a simple text format');

  console.log('\n');
}

// Run the examples
(function runExamples(): void {
  customConfigurationExample();
  jsonFormatExample();
  simpleFormatExample();
})();
