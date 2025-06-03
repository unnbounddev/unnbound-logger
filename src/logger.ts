/**
 * Core logger implementation
 */
import { Logger as WinstonLogger } from 'winston';
import {
  LogLevel,
  LoggerOptions,
  GeneralLogOptions,
  HttpRequestLogOptions,
  HttpResponseLogOptions,
  SftpOperationLogOptions,
  HttpMethod,
  SftpMethod,
  GeneralLogEntry,
  HttpRequestLogEntry,
  HttpResponseLogEntry,
  SftpOperationLogEntry,
  LoggingEngine,
} from './types';
import { generateUuid, generateTimestamp, getTraceId } from './utils/id-generator';
import { WinstonAdapter } from './adapters/winston-adapter';

/**
 * UnnboundLogger provides typed, structured logging
 */
export class UnnboundLogger {
  private engine: LoggingEngine;
  private defaultLevel: LogLevel;
  private serviceName?: string;
  private environment?: string;

  /**
   * Creates a new UnnboundLogger instance
   * @param options - Configuration options for the logger
   */
  constructor(options: LoggerOptions = {}) {
    this.defaultLevel = options.defaultLevel || 'info';
    this.serviceName = options.serviceName;
    this.environment = options.environment;

    if (options.engine) {
      this.engine = options.engine;
    } else {
      // Create a default Winston adapter
      this.engine = new WinstonAdapter({
        level: this.defaultLevel,
        transports: options.transports,
        serviceName: this.serviceName,
        environment: this.environment,
      });
    }
  }

  /**
   * Logs a general message
   * @param level - Log level
   * @param message - Log message
   * @param options - Additional logging options
   */
  log(
    level: LogLevel,
    message: string | Record<string, unknown>,
    options: GeneralLogOptions = {}
  ): void {
    const workflowId = options.workflowId || generateUuid();
    const traceId = options.traceId || getTraceId(workflowId);

    const logEntry: GeneralLogEntry = {
      logId: generateUuid(),
      timestamp: generateTimestamp(),
      traceId,
      workflowId,
      logLevel: level,
      logType: 'general',
      message,
      method: null,
      url: null,
      requestId: null,
      responseStatusCode: null,
      filePath: null,
      fileName: null,
      fileSize: null,
      duration: null,
    };

    this.engine.log(level, '', { ...logEntry });
  }

  /**
   * Logs an error message
   * @param message - Error message or object
   * @param options - Additional logging options
   */
  error(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    let logMessage: string | Record<string, unknown>;

    if (message instanceof Error) {
      logMessage = {
        message: message.message,
        stack: message.stack,
        name: message.name,
      };
    } else {
      logMessage = message;
    }

    this.log('error', logMessage, options);
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param options - Additional logging options
   */
  warn(message: string | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    this.log('warn', message, options);
  }

  /**
   * Logs an info message
   * @param message - Info message
   * @param options - Additional logging options
   */
  info(message: string | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    this.log('info', message, options);
  }

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param options - Additional logging options
   */
  debug(message: string | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    this.log('debug', message, options);
  }

  /**
   * Logs an HTTP request
   * @param method - HTTP method
   * @param url - Request URL
   * @param body - Optional request body
   * @param options - Additional logging options
   * @returns The request ID for correlating with the response
   */
  httpRequest(
    method: HttpMethod,
    url: string,
    body: Record<string, unknown> | null = null,
    options: HttpRequestLogOptions = {}
  ): string {
    const workflowId = options.workflowId || generateUuid();
    const traceId = options.traceId || getTraceId(workflowId);
    const requestId = options.requestId || generateUuid();

    const logEntry: HttpRequestLogEntry = {
      logId: generateUuid(),
      timestamp: generateTimestamp(),
      requestId,
      traceId,
      workflowId,
      logLevel: options.level || this.defaultLevel,
      logType: 'httpRequest',
      method,
      url,
      message: body,
      responseStatusCode: null,
      filePath: null,
      fileName: null,
      fileSize: null,
      duration: null,
    };

    this.engine.log(options.level || this.defaultLevel, '', { ...logEntry });
    return requestId;
  }

  /**
   * Logs an HTTP response
   * @param method - HTTP method
   * @param url - Request URL
   * @param statusCode - HTTP status code
   * @param body - Optional response body
   * @param options - Additional logging options
   */
  httpResponse(
    method: HttpMethod,
    url: string,
    statusCode: number,
    body: Record<string, unknown> | null = null,
    options: HttpResponseLogOptions
  ): void {
    const workflowId = options.workflowId || generateUuid();
    const traceId = options.traceId || getTraceId(workflowId);
    const requestId = options.requestId || generateUuid();

    // Determine log level based on status code
    let level: LogLevel = options.level || this.defaultLevel;
    if (!options.level) {
      if (statusCode >= 500) {
        level = 'error';
      } else if (statusCode >= 400) {
        level = 'warn';
      } else {
        level = 'info';
      }
    }

    const logEntry: HttpResponseLogEntry = {
      logId: generateUuid(),
      timestamp: generateTimestamp(),
      requestId,
      traceId,
      workflowId,
      logLevel: level,
      logType: 'httpResponse',
      method,
      url,
      responseStatusCode: statusCode,
      message: body,
      duration: options.duration,
      filePath: null,
      fileName: null,
      fileSize: null,
    };

    this.engine.log(level, '', { ...logEntry });
  }

  /**
   * Logs an SFTP operation
   * @param method - SFTP method
   * @param url - SFTP server URL
   * @param filePath - Path to the file on the SFTP server
   * @param fileName - Name of the file
   * @param options - Additional logging options
   */
  sftpOperation(
    method: SftpMethod,
    url: string,
    filePath: string,
    fileName: string,
    options: SftpOperationLogOptions
  ): void {
    const workflowId = options.workflowId || generateUuid();
    const traceId = options.traceId || getTraceId(workflowId);

    const logEntry: SftpOperationLogEntry = {
      logId: generateUuid(),
      timestamp: generateTimestamp(),
      requestId: null,
      traceId,
      workflowId,
      logLevel: options.level || this.defaultLevel,
      logType: 'sftpOperation',
      method,
      url,
      responseStatusCode: null,
      message: null,
      filePath,
      fileName,
      fileSize: options.fileSize || null,
      duration: options.duration,
    };

    this.engine.log(options.level || this.defaultLevel, '', { ...logEntry });
  }
}
