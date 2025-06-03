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
  HttpMethod,
  GeneralLogEntry,
  HttpRequestLogEntry,
  HttpResponseLogEntry,
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

    // Store request metadata in res.locals for later use
    if (req.res) {
      req.res.locals.requestId = requestId;
      req.res.locals.startTime = startTime;
      req.res.locals.workflowId = workflowId;
      req.res.locals.traceId = traceId;
    }

    // Extract request details
    const requestDetails = {
      method: req.method as HttpMethod,
      url: req.originalUrl || req.url,
      protocol: req.protocol,
      hostname: req.hostname,
      ip: req.ip,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: this.sanitizeHeaders(req.headers),
      cookies: req.cookies,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
    };

    const logEntry: HttpRequestLogEntry = {
      logId: generateUuid(),
      timestamp: generateTimestamp(),
      requestId,
      traceId,
      workflowId,
      logLevel: options.level || this.defaultLevel,
      logType: 'httpRequest',
      method: requestDetails.method,
      url: requestDetails.url,
      message: requestDetails,
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
    // Get stored metadata from res.locals or use provided options
    const requestId = res.locals.requestId || options.requestId || generateUuid();
    const startTime = res.locals.startTime || options.startTime || Date.now();
    const workflowId = res.locals.workflowId || options.workflowId || generateUuid();
    const traceId = res.locals.traceId || options.traceId || getTraceId(workflowId);
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

    // Extract response details
    const responseDetails = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: this.sanitizeHeaders(res.getHeaders()),
      body: res.locals.body,
      cookies: res.get('set-cookie'),
      contentLength: res.get('content-length'),
      contentType: res.get('content-type'),
      duration,
    };

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
      message: responseDetails,
      duration,
      filePath: null,
      fileName: null,
      fileSize: null,
    };

    this.engine.log(level, '', { ...logEntry });
  }

  /**
   * Sanitizes headers by removing sensitive information
   * @param headers - Headers to sanitize
   * @returns Sanitized headers
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-csrf-token',
    ];

    const sanitized = { ...headers };
    for (const header of sensitiveHeaders) {
      if (header in sanitized) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
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
