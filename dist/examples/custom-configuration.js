"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Custom configuration examples for winston-structured-logger
 */
const index_1 = require("../index");
const winston_1 = require("winston");
/**
 * Demonstrates custom logger configuration
 */
function customConfigurationExample() {
    console.log('=== Custom Configuration Example ===');
    // Create a logger with custom format and transports
    const logger = new index_1.StructuredLogger({
        defaultLevel: 'debug',
        serviceName: 'user-service',
        environment: 'development',
        format: 'pretty',
        transports: [
            new winston_1.transports.Console({
                format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp(), winston_1.format.printf(({ timestamp, level, message, ...rest }) => {
                    return `${timestamp} ${level}: ${message} ${JSON.stringify(rest)}`;
                }))
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
function jsonFormatExample() {
    console.log('=== JSON Format Example ===');
    const logger = new index_1.StructuredLogger({
        format: 'json'
    });
    logger.info('This will be formatted as JSON');
    console.log('\n');
}
/**
 * Demonstrates simple text format
 */
function simpleFormatExample() {
    console.log('=== Simple Format Example ===');
    const logger = new index_1.StructuredLogger({
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
