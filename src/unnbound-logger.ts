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
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { traceContext } from './utils/trace-context';
import { InternalAxiosRequestConfig, AxiosHeaders } from 'axios';

/**
 * UnnboundLogger provides typed, structured logging
 */
export class UnnboundLogger {
  private engine: LoggingEngine;
  private defaultLevel: LogLevel;
  private serviceName?: string;
  private environment?: string;
  private traceHeaderKey: string;
  private ignoreTraceRoutes: string[];
  private ignoreAxiosTraceRoutes: string[];

  /**
   * Creates a new UnnboundLogger instance
   * @param options - Configuration options for the logger
   */
  constructor(options: LoggerOptions = {}) {
    this.defaultLevel = options.defaultLevel || 'info';
    this.serviceName = options.serviceName;
    this.environment = options.environment;
    this.traceHeaderKey = options.traceHeaderKey || 'unnbound-trace-id';
    this.ignoreTraceRoutes = options.ignoreTraceRoutes || [];
    this.ignoreAxiosTraceRoutes = options.ignoreAxiosTraceRoutes || [];

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
   * Checks if a path matches any of the ignore patterns
   * @param path - The path to check
   * @param patterns - Array of glob patterns to match against
   * @returns boolean indicating if the path should be ignored
   */
  private shouldIgnorePath(path: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*/g, '.*') // Convert * to .*
        .replace(/\?/g, '.'); // Convert ? to .
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    });
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
   * @param req - Express request object
   * @param options - Additional logging options
   * @returns The request ID for correlating with the response
   */
  httpRequest(req: Request, options: HttpRequestLogOptions = {}): string {
    const workflowId = options.workflowId || generateUuid();
    const traceId = options.traceId || getTraceId(workflowId);
    const requestId = options.requestId || generateUuid();
    const startTime = options.startTime || Date.now();

    const logEntry: HttpRequestLogEntry = {
      logId: generateUuid(),
      timestamp: generateTimestamp(),
      requestId,
      traceId,
      workflowId,
      logLevel: options.level || this.defaultLevel,
      logType: 'httpRequest',
      method: req.method as HttpMethod,
      url: req.originalUrl || req.url,
      message: {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      },
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
   * @param res - Express response object
   * @param req - Express request object
   * @param options - Additional logging options
   */
  httpResponse(res: Response, req: Request, options: HttpResponseLogOptions = {}): void {
    const workflowId = options.workflowId || generateUuid();
    const traceId = options.traceId || getTraceId(workflowId);
    const requestId = options.requestId || generateUuid();
    const startTime = options.startTime || Date.now();
    const duration = options.duration || (Date.now() - startTime);

    // Determine log level based on status code
    let level: LogLevel = options.level || this.defaultLevel;
    if (!options.level) {
      if (res.statusCode >= 500) {
        level = 'error';
      } else if (res.statusCode >= 400) {
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
      method: req.method as HttpMethod,
      url: req.originalUrl || req.url,
      responseStatusCode: res.statusCode,
      message: {
        body: res.locals.body, // Assuming response body is stored in res.locals
        headers: res.getHeaders(),
      },
      duration,
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

  // Public getter for traceHeaderKey
  public getTraceHeaderKey(): string {
    return this.traceHeaderKey;
  }

  // Trace middleware
  public traceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Check if the route should be ignored
    if (this.shouldIgnorePath(req.path, this.ignoreTraceRoutes)) {
      return next();
    }

    const traceId = req.header(this.traceHeaderKey) || uuidv4();
    res.setHeader(this.traceHeaderKey, traceId);
    traceContext.run(traceId, () => {
      next();
    });
  };

  // Axios trace middleware
  public axiosTraceMiddleware = {
    onFulfilled: (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      // Check if the URL should be ignored
      if (config.url && this.shouldIgnorePath(config.url, this.ignoreAxiosTraceRoutes)) {
        return config;
      }

      const traceId = traceContext.getTraceId();
      if (traceId) {
        const headers = new AxiosHeaders(config.headers);
        headers.set(this.traceHeaderKey, traceId);
        config.headers = headers;
      }
      return config;
    },
    onRejected: (error: any): any => {
      return Promise.reject(error);
    }
  };
}
