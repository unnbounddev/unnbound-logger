/**
 * unnbound-logger
 *
 * A structured logging library built on Pino with TypeScript support.
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
  SftpTransactionLogOptions,
  DbQueryTransactionLogOptions,
  Log,
  LogTransaction,
  HttpRequestLog,
  HttpResponseLog,
  SftpTransactionLog,
  DbQueryTransactionLog,
  SerializableError,
} from './types';
import { clearTraceId } from './utils/logger-utils';

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
  SftpTransactionLogOptions,
  DbQueryTransactionLogOptions,
  Log,
  LogTransaction,
  HttpRequestLog,
  HttpResponseLog,
  SftpTransactionLog,
  DbQueryTransactionLog,
  SerializableError,

  // Utils
  clearTraceId,
};
