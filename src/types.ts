/**
 * Type definitions for structured logging library
 */
import { Logger as WinstonLogger } from 'winston';

/**
 * Available log levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Available log types
 */
export type LogType = 'general' | 'httpRequest' | 'httpResponse' | 'sftpOperation';

/**
 * HTTP methods supported for HTTP logging
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * SFTP methods supported for SFTP logging
 */
export type SftpMethod = 'CONNECT' | 'LIST' | 'GET' | 'PUT' | 'DELETE' | 'MKDIR' | 'RMDIR' | 'RENAME';

/**
 * Interface for logging engine implementations
 */
export interface LoggingEngine {
  log(level: LogLevel, message: string | Record<string, unknown>, meta: Record<string, unknown>): void;
  error(message: string | Record<string, unknown>, meta: Record<string, unknown>): void;
  warn(message: string | Record<string, unknown>, meta: Record<string, unknown>): void;
  info(message: string | Record<string, unknown>, meta: Record<string, unknown>): void;
  debug(message: string | Record<string, unknown>, meta: Record<string, unknown>): void;
}

/**
 * Base interface for all log entries
 */
export interface BaseLogEntry {
  /** Unique identifier for this log entry */
  logId: string;
  /** ISO timestamp when this log was created */
  timestamp: string;
  /** Trace ID for distributed tracing */
  traceId: string;
  /** Workflow ID for business process tracking */
  workflowId: string;
  /** Log severity level */
  logLevel: LogLevel;
  /** Type of log entry */
  logType: LogType;
  /** Log message content */
  message: string | Record<string, unknown> | null;
}

/**
 * Interface for general logs
 */
export interface GeneralLogEntry extends BaseLogEntry {
  logType: 'general';
  method: null;
  url: null;
  requestId: null;
  responseStatusCode: null;
  filePath: null;
  fileName: null;
  fileSize: null;
  duration: null;
}

/**
 * Interface for HTTP request logs
 */
export interface HttpRequestLogEntry extends BaseLogEntry {
  logType: 'httpRequest';
  /** Unique identifier for this HTTP request */
  requestId: string;
  /** HTTP method used */
  method: HttpMethod;
  /** Request URL */
  url: string;
  responseStatusCode: null;
  filePath: null;
  fileName: null;
  fileSize: null;
  duration: null;
}

/**
 * Interface for HTTP response logs
 */
export interface HttpResponseLogEntry extends BaseLogEntry {
  logType: 'httpResponse';
  /** Unique identifier for this HTTP request */
  requestId: string;
  /** HTTP method used */
  method: HttpMethod;
  /** Request URL */
  url: string;
  /** HTTP response status code */
  responseStatusCode: number;
  /** Duration of the request in milliseconds */
  duration: number;
  filePath: null;
  fileName: null;
  fileSize: null;
}

/**
 * Interface for SFTP operation logs
 */
export interface SftpOperationLogEntry extends BaseLogEntry {
  logType: 'sftpOperation';
  requestId: null;
  /** SFTP operation method */
  method: SftpMethod;
  /** SFTP server URL */
  url: string;
  responseStatusCode: null;
  /** Path to the file on the SFTP server */
  filePath: string;
  /** Name of the file */
  fileName: string;
  /** Size of the file in bytes */
  fileSize: number | null;
  /** Duration of the SFTP operation in milliseconds */
  duration: number;
}

/**
 * Union type for all log entry types
 */
export type LogEntry =
  | GeneralLogEntry
  | HttpRequestLogEntry
  | HttpResponseLogEntry
  | SftpOperationLogEntry;

/**
 * Configuration options for the logger
 */
export interface LoggerOptions {
  /** Default log level */
  defaultLevel?: LogLevel;
  /** Custom logging engine implementation */
  engine?: LoggingEngine;
  /** Winston logger instance (if you want to provide your own) */
  winstonLogger?: WinstonLogger;
  /** Additional transport configurations */
  transports?: Array<WinstonLogger['transports'][number]>;
  /** Optional service name to include in logs */
  serviceName?: string;
  /** Optional environment name to include in logs */
  environment?: string;
}

/**
 * Options for general logs
 */
export interface GeneralLogOptions {
  /** Log level override */
  level?: LogLevel;
  /** Custom trace ID */
  traceId?: string;
  /** Custom workflow ID */
  workflowId?: string;
  /** Custom metadata */
  [key: string]: unknown;
}

/**
 * Options for HTTP request logs
 */
export interface HttpRequestLogOptions extends GeneralLogOptions {
  /** Custom request ID */
  requestId?: string;
}

/**
 * Options for HTTP response logs
 */
export interface HttpResponseLogOptions extends HttpRequestLogOptions {
  /** Duration of the request in milliseconds */
  duration: number;
}

/**
 * Options for SFTP operation logs
 */
export interface SftpOperationLogOptions extends GeneralLogOptions {
  /** Duration of the SFTP operation in milliseconds */
  duration: number;
  /** Size of the file in bytes */
  fileSize?: number | null;
}
