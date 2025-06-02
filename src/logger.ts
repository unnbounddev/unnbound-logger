/**
 * Core logger implementation built on Winston
 */
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import {
  LogLevel,
  LogType,
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
  SftpOperationLogEntry
} from './types';
import {
  generateUuid,
  generateTimestamp,
  getTraceId
} from './utils/id-generator';

/**
 * StructuredLogger provides typed, structured logging with Winston
 */
export class StructuredLogger {
  private logger: WinstonLogger;
  private defaultLevel: LogLevel;
  private serviceName?: string;
  private environment?: string;

  /**
   * Creates a new StructuredLogger instance
   * @param options - Configuration options for the logger
   */
  constructor(options: LoggerOptions = {}) {
    this.defaultLevel = options.defaultLevel || 'info';
    this.serviceName = options.serviceName;
    this.environment = options.environment;

    if (options.winstonLogger) {
      this.logger = options.winstonLogger;
    } else {
      const logFormat = this.getLogFormat(options.format || 'json');

      this.logger = createLogger({
        level: this.defaultLevel,
        format: logFormat,
        defaultMeta: {
          ...(this.serviceName && { service: this.serviceName }),
          ...(this.environment && { environment: this.environment })
        },
        transports: options.transports || [new transports.Console()]
      });
    }
  }

  /**
   * Creates the log format based on the specified format type
   * @param formatType - The format type ('json', 'simple', or 'pretty')
   * @returns Winston format
   */
  private getLogFormat(formatType: 'json' | 'simple' | 'pretty') {
    switch (formatType) {
      case 'simple':
        return format.combine(
          format.timestamp(),
          format.simple()
        );
      case 'pretty':
        return format.combine(
          format.timestamp(),
          format.prettyPrint()
        );
      case 'json':
      default:
        return format.combine(
          format.timestamp(),
          format.json()
        );
    }
  }

  /**
   * Logs a general message
   * @param level - Log level
   * @param message - Log message
   * @param options - Additional logging options
   */
  log(level: LogLevel, message: string | Record<string, any>, options: GeneralLogOptions = {}): void {
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
      duration: null
    };

    this.logger.log(level, '', { ...logEntry });
  }

  /**
   * Logs an error message
   * @param message - Error message or object
   * @param options - Additional logging options
   */
  error(message: string | Error | Record<string, any>, options: GeneralLogOptions = {}): void {
    let logMessage: string | Record<string, any>;

    if (message instanceof Error) {
      logMessage = {
        message: message.message,
        stack: message.stack,
        name: message.name
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
  warn(message: string | Record<string, any>, options: GeneralLogOptions = {}): void {
    this.log('warn', message, options);
  }

  /**
   * Logs an info message
   * @param message - Info message
   * @param options - Additional logging options
   */
  info(message: string | Record<string, any>, options: GeneralLogOptions = {}): void {
    this.log('info', message, options);
  }

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param options - Additional logging options
   */
  debug(message: string | Record<string, any>, options: GeneralLogOptions = {}): void {
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
    body: Record<string, any> | null = null,
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
      duration: null
    };

    this.logger.log(options.level || this.defaultLevel, '', { ...logEntry });
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
    body: Record<string, any> | null = null,
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
      fileSize: null
    };

    this.logger.log(level, '', { ...logEntry });
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
      duration: options.duration
    };

    this.logger.log(options.level || this.defaultLevel, '', { ...logEntry });
  }
}