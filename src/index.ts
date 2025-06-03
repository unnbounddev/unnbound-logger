/**
 * unnbound-logger
 *
 * A structured logging library built on top of Winston with TypeScript support.
 * Provides consistent, well-typed logging across different operational contexts.
 */
import { UnnboundLogger } from './unnbound-logger';
import {
  LogLevel,
  LogType,
  HttpMethod,
  LoggerOptions,
  GeneralLogOptions,
  HttpRequestLogOptions,
  HttpResponseLogOptions,
  BaseLogEntry,
  GeneralLogEntry,
  HttpRequestLogEntry,
  HttpResponseLogEntry,
  LogEntry,
} from './types';
import { generateUuid, generateTimestamp, getTraceId, clearTraceId } from './utils/id-generator';

// Export everything needed for the library
export {
  // Main logger class
  UnnboundLogger,

  // Types
  LogLevel,
  LogType,
  HttpMethod,
  LoggerOptions,
  GeneralLogOptions,
  HttpRequestLogOptions,
  HttpResponseLogOptions,
  BaseLogEntry,
  GeneralLogEntry,
  HttpRequestLogEntry,
  HttpResponseLogEntry,
  LogEntry,

  // Utils
  generateUuid,
  generateTimestamp,
  getTraceId,
  clearTraceId,
};

// Create a default logger instance
const defaultLogger = new UnnboundLogger();
export { defaultLogger };

// Export default logger functions for convenience
export const log = defaultLogger.log.bind(defaultLogger);
export const error = defaultLogger.error.bind(defaultLogger);
export const warn = defaultLogger.warn.bind(defaultLogger);
export const info = defaultLogger.info.bind(defaultLogger);
export const debug = defaultLogger.debug.bind(defaultLogger);
export const httpRequest = defaultLogger.httpRequest.bind(defaultLogger);
export const httpResponse = defaultLogger.httpResponse.bind(defaultLogger);

// Default export is the UnnboundLogger class
export default UnnboundLogger;
