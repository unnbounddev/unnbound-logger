/**
 * Custom configuration examples for winston-structured-logger
 */
import { StructuredLogger } from '../index';
import { transports, format } from 'winston';

/**
 * Demonstrates custom logger configuration
 */
function customConfigurationExample(): void {
  console.log('=== Custom Configuration Example ===');
  
  // Create a logger with custom format and transports
  const logger = new StructuredLogger({
    defaultLevel: 'debug',
    serviceName: 'user-service',
    environment: 'development',
    format: 'pretty',
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.timestamp(),
          format.printf(({ timestamp, level, message, ...rest }) => {
            return `${timestamp} ${level}: ${message} ${JSON.stringify(rest)}`;
          })
        )
      })
    ]
  });
  
  // Log with custom configuration
  logger.info('Application started with custom configuration');
  logger.debug('Detailed configuration', { 
    appVersion: '1.2.3',
    nodeEnv: 'development'
  });
  
  console.log('\n');
}

/**
 * Demonstrates JSON output format
 */
function jsonFormatExample(): void {
  console.log('=== JSON Format Example ===');
  
  const logger = new StructuredLogger({
    format: 'json'
  });
  
  logger.info('This will be formatted as JSON');
  
  console.log('\n');
}

/**
 * Demonstrates simple text format
 */
function simpleFormatExample(): void {
  console.log('=== Simple Format Example ===');
  
  const logger = new StructuredLogger({
    format: 'simple'
  });
  
  logger.info('This will be formatted in a simple text format');
  
  console.log('\n');
}

// Run the examples
(function runExamples() {
  customConfigurationExample();
  jsonFormatExample();
  simpleFormatExample();
})();