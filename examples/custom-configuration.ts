/* eslint-disable no-console */
/**
 * Custom configuration examples for unnbound-logger
 */
import { UnnboundLogger } from '../src/index';
import { Console, File } from 'winston/lib/winston/transports';

/**
 * Demonstrates custom logger configuration
 */
function customConfigurationExample(): void {
  console.log('=== Custom Configuration Example ===');

  // Example 1: Custom log level
  const logger = new UnnboundLogger({
    defaultLevel: 'debug', // Set default level to debug
  });

  // Example 2: Custom Winston logger with transports
  const customLogger = new UnnboundLogger({
    defaultLevel: 'info',
    transports: [
      new Console(),
      new File({ filename: 'error.log', level: 'error' }),
      new File({ filename: 'combined.log' }),
    ],
    serviceName: 'custom-service',
    environment: 'development'
  });

  // Example 3: Service-specific configuration
  const prettyLogger = new UnnboundLogger({
    defaultLevel: 'info',
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
    defaultLevel: 'info',
    serviceName: 'json-service',
    environment: 'development'
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
    defaultLevel: 'info',
    serviceName: 'simple-service',
    environment: 'development'
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
