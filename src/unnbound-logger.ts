/**
 * Core logger implementation
 */
import pino from 'pino';
import {
  LogLevel,
  LoggerOptions,
  GeneralLogOptions,
  HttpRequestLogOptions,
  HttpResponseLogOptions,
  SftpTransactionLogOptions,
  DbQueryTransactionLogOptions,
  Log,
  HttpRequestLog,
  HttpResponseLog,
  SftpTransactionLog,
  DbQueryTransactionLog,
  SerializableError,
} from './types';
import { filterHeaders, normalizeIp } from './utils/logger-utils';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { traceContext } from './utils/trace-context';
import { InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { getStatusMessage } from './utils/http-status-messages';

// Extend AxiosRequestConfig to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime: number; requestId?: string };
  }
}

/**
 * UnnboundLogger provides typed, structured logging using Pino
 */
export class UnnboundLogger {
  private logger: pino.Logger;
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

    // Create Pino logger
    this.logger = pino({
      level: this.defaultLevel,
      base: {
        ...(this.serviceName && { service: this.serviceName }),
        ...(this.environment && { environment: this.environment }),
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      formatters: {
        level: (label: string) => {
          return { level: label };
        },
      },
    });
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
    message: string | Error | Record<string, unknown>,
    options: GeneralLogOptions = {}
  ): void {
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();

    let logEntry: Omit<Log<'general'>, 'level'> & { [key: string]: any };

    const {
      traceId: optionTraceId,
      requestId: optionRequestId,
      ...restOptions
    } = options;

    if (message instanceof Error) {
      const error: SerializableError = {
        name: message.name,
        message: message.message,
        stack: message.stack,
      };
      logEntry = {
        type: 'general' as const,
        traceId,
        requestId,
        message: message.name,
        error,
        ...restOptions,
      };
    } else if (typeof message === 'string') {
      logEntry = {
        type: 'general' as const,
        traceId,
        requestId,
        message,
        ...restOptions,
      };
    } else {
      // If message is an object, it's part of the log entry
      logEntry = {
        type: 'general' as const,
        traceId,
        requestId,
        ...(message as Record<string, unknown>),
        message: (message as { message?: string }).message || 'Structured log data',
        ...restOptions,
      };
    }

    this.logger[level](logEntry);
  }

  /**
   * Logs an error message
   * @param message - Error message or object
   * @param options - Additional logging options
   */
  error(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    this.log('error', message, options);
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param options - Additional logging options
   */
  warn(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    this.log('warn', message, options);
  }

  /**
   * Logs an info message
   * @param message - Info message
   * @param options - Additional logging options
   */
  info(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    this.log('info', message, options);
  }

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param options - Additional logging options
   */
  debug(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): void {
    this.log('debug', message, options);
  }

  /**
   * Constructs the full URL from request information
   * @param req - Express request object
   * @returns Full URL string
   */
  private constructFullUrl(req: Request): string {
    // If the URL is already absolute, return it directly
    const reqUrl = req.originalUrl || req.url;
    if (reqUrl?.startsWith('http://') || reqUrl?.startsWith('https://')) {
      return reqUrl;
    }

    // Check if we have a base URL configured via environment variable
    const serviceBaseUrl = process.env.SERVICE_BASE_URL;
    if (serviceBaseUrl) {
      // Use configured base URL (useful for ECS when you know your service URL)
      return `${serviceBaseUrl.replace(/\/$/, '')}${reqUrl}`;
    }

    // Fallback to constructing from request info for incoming requests
    const protocol = req.protocol || (req.secure ? 'https' : 'http');
    const host = req.get('host') || req.get('x-forwarded-host') || 'localhost';
    
    return `${protocol}://${host}${reqUrl}`;
  }

  /**
   * Logs an HTTP request
   * @param req - Express request object
   * @param options - Additional logging options
   * @returns The request ID for correlating with the response
   */
  httpRequest(req: Request, options: HttpRequestLogOptions = {}): string {
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();
    const startTime = options.startTime || Date.now();

    // Store request metadata in res.locals for later use
    if (req.res) {
      req.res.locals.requestId = requestId;
      req.res.locals.startTime = startTime;
      req.res.locals.traceId = traceId;
    }

    const logEntry: Omit<HttpRequestLog, 'level'> = {
      type: 'httpRequest',
      message: req.ip === 'outgoing' ? 'Outgoing HTTP Request' : 'Incoming HTTP Request',
      traceId,
      requestId,
      duration: 0, // Will be updated in response
      httpRequest: {
        url: this.constructFullUrl(req),
        method: req.method,
        headers: filterHeaders(req.headers),
        ip: normalizeIp(req.ip),
        body: req.body,
      },
    };

    this.logger[options.level || this.defaultLevel](logEntry);
    return requestId;
  }

  /**
   * Logs an HTTP response
   * @param res - Express response object
   * @param req - Express request object
   * @param options - Additional logging options
   */
  httpResponse(res: Response, req: Request, options: HttpResponseLogOptions = {}): void {
    const requestId = res.locals.requestId || options.requestId || uuidv4();
    const startTime = res.locals.startTime || options.startTime || Date.now();
    const traceId = res.locals.traceId || options.traceId || traceContext.getTraceId() || uuidv4();
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

    const logEntry: Omit<HttpResponseLog, 'level'> = {
      type: 'httpResponse',
      message: getStatusMessage(res.statusCode),
      traceId,
      requestId,
      duration,
      httpResponse: {
        url: this.constructFullUrl(req),
        method: req.method,
        headers: filterHeaders(res.getHeaders()),
        ip: normalizeIp(req.ip),
        status: res.statusCode,
        body: res.locals.body,
      },
    };

    this.logger[level](logEntry);
  }

  /**
   * Logs an SFTP transaction
   * @param operation - SFTP operation details
   * @param options - Additional logging options
   */
  sftpTransaction(
    operation: {
      host: string;
      username: string;
      operation: 'upload' | 'download' | 'list' | 'delete' | 'rename' | 'stat';
      path: string;
      status: 'success' | 'failure';
      bytesTransferred?: number;
      filesListed?: number;
      sourcePath?: string;
    },
    options: SftpTransactionLogOptions = {}
  ): void {
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();
    const duration = options.duration || (options.startTime ? Date.now() - options.startTime : 0);

    const level: LogLevel = operation.status === 'success' ? 'info' : 'error';

    const logEntry: Omit<SftpTransactionLog, 'level'> = {
      type: 'sftpTransaction',
      message: `SFTP ${operation.operation} ${operation.status} - ${operation.path}`,
      traceId,
      requestId,
      duration,
      sftp: operation,
    };

    this.logger[level](logEntry);
  }

  /**
   * Logs a database query transaction
   * @param query - Database query details
   * @param options - Additional logging options
   */
  dbQueryTransaction(
    query: {
      instance: string;
      vendor: 'postgres' | 'mysql' | 'mssql' | 'mongodb';
      query?: string;
      status: 'success' | 'failure';
      rowsReturned?: number;
      rowsAffected?: number;
    },
    options: DbQueryTransactionLogOptions = {}
  ): void {
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();
    const duration = options.duration || (options.startTime ? Date.now() - options.startTime : 0);

    const level: LogLevel = query.status === 'success' ? 'info' : 'error';

    const logEntry: Omit<DbQueryTransactionLog, 'level'> = {
      type: 'dbQueryTransaction',
      message: `DB Query ${query.status} - ${query.vendor}`,
      traceId,
      requestId,
      duration,
      db: query,
    };

    this.logger[level](logEntry);
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
      // Log the incoming request
      const requestId = this.httpRequest(req, { traceId });

      // Capture response body for logging
      const originalSend = res.send;
      res.send = function(body) {
        res.locals.body = body;
        return originalSend.call(this, body);
      };

      // Log the response when it finishes
      res.on('finish', () => {
        this.httpResponse(res, req, { requestId, traceId });
      });

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

      // Store request start time and generate requestId for duration calculation and correlation
      const startTime = Date.now();
      const requestId = uuidv4();
      config.metadata = { startTime, requestId };
      
      // Log the outgoing request using proper httpRequest method
      const mockReq = {
        method: config.method?.toUpperCase() || 'UNKNOWN',
        url: `${config.baseURL || ''}${config.url}`,
        originalUrl: `${config.baseURL || ''}${config.url}`,
        headers: config.headers || {},
        body: config.data,
        ip: 'outgoing', // Mark as outgoing request
        protocol: 'https', // Default for outgoing
        secure: true,
        get: () => undefined // Mock get method for constructFullUrl
      } as any;

      this.httpRequest(mockReq, { 
        traceId,
        requestId,
        startTime 
      });

      return config;
    },
    onRejected: (error: any): any => {
      return Promise.reject(error);
    }
  };

  // Axios response interceptor (should be used separately)
  public axiosResponseInterceptor = {
    onFulfilled: (response: any): any => {
      // Calculate duration
      const startTime = response.config.metadata?.startTime || Date.now();
      const requestId = response.config.metadata?.requestId;
      const duration = Date.now() - startTime;
      
      // Log the successful response using proper httpResponse method
      const mockReq = {
        method: response.config.method?.toUpperCase() || 'UNKNOWN',
        url: `${response.config.baseURL || ''}${response.config.url}`,
        originalUrl: `${response.config.baseURL || ''}${response.config.url}`,
        ip: 'outgoing', // Mark as outgoing request
        protocol: 'https', // Default for outgoing
        secure: true,
        get: () => undefined // Mock get method for constructFullUrl
      } as any;

      const mockRes = {
        statusCode: response.status,
        locals: { 
          body: response.data,
          startTime: startTime,
          traceId: traceContext.getTraceId(),
          requestId: requestId
        },
        getHeaders: () => response.headers || {}
      } as any;

      this.httpResponse(mockRes, mockReq, {
        requestId,
        duration,
        traceId: traceContext.getTraceId()
      });
      
      return response;
    },
    onRejected: (error: any): any => {
      // Calculate duration for error responses
      const startTime = error.config?.metadata?.startTime || Date.now();
      const requestId = error.config?.metadata?.requestId;
      const duration = Date.now() - startTime;
      
      // Log the error response using proper httpResponse method
      if (error.response) {
        const mockReq = {
          method: error.config?.method?.toUpperCase() || 'UNKNOWN',
          url: `${error.config?.baseURL || ''}${error.config?.url}`,
          originalUrl: `${error.config?.baseURL || ''}${error.config?.url}`,
          ip: 'outgoing', // Mark as outgoing request
          protocol: 'https', // Default for outgoing
          secure: true,
          get: () => undefined // Mock get method for constructFullUrl
        } as any;

        const mockRes = {
          statusCode: error.response.status,
          locals: { 
            body: error.response.data,
            startTime: startTime,
            traceId: traceContext.getTraceId(),
            requestId: requestId
          },
          getHeaders: () => error.response.headers || {}
        } as any;

        this.httpResponse(mockRes, mockReq, {
          requestId,
          duration,
          traceId: traceContext.getTraceId()
        });
      } else {
        // For network errors without response, log as general error
        this.error('HTTP Request Failed', {
          context: {
            reason: 'No response received',
            method: error.config?.method?.toUpperCase() || 'UNKNOWN',
            url: `${error.config?.baseURL || ''}${error.config?.url}`,
          },
          error: error.message,
          requestId,
          traceId: traceContext.getTraceId()
        });
      }

      return Promise.reject(error);
    }
  };
}
