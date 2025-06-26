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
import { filterHeaders, normalizeIp, safeJsonParse } from './utils/logger-utils';
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
  private workflowId: string;
  private workflowUrl: string;
  private serviceId: string;
  private deploymentId: string;
  private traceHeaderKey: string;
  private ignoreTraceRoutes: string[];
  private ignoreAxiosTraceRoutes: string[];

  /**
   * Creates a new UnnboundLogger instance
   * @param options - Configuration options for the logger
   */
  constructor(options: LoggerOptions = {}) {
    this.workflowId = process.env.UNNBOUND_WORKFLOW_ID || '';
    this.workflowUrl = process.env.UNNBOUND_WORKFLOW_URL || '';
    this.serviceId = process.env.UNNBOUND_SERVICE_ID || '';
    this.deploymentId = process.env.UNNBOUND_DEPLOYMENT_ID || '';
    this.traceHeaderKey = options.traceHeaderKey || 'unnbound-trace-id';
    this.ignoreTraceRoutes = options.ignoreTraceRoutes || [];
    this.ignoreAxiosTraceRoutes = options.ignoreAxiosTraceRoutes || [];

    // Create Pino logger
    this.logger = pino({
      level: 'info',
      base: {}, // Disable all default base fields (pid, hostname)
      timestamp: false, // Let CloudWatch handle timestamps
      messageKey: 'messages', // Change message field from 'msg' to 'messages'
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
  ): Log {
    const logId = uuidv4();
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();

    let logEntry: Omit<Log<'general'>, 'level'> & { [key: string]: any };

    const {
      traceId: optionTraceId,
      requestId: optionRequestId,
      level: optionLevel,
      ...restOptions
    } = options;

    const baseEntry = {
      logId,
      type: 'general' as const,
      workflowId: this.workflowId,
      serviceId: this.serviceId,
      traceId,
      requestId,
      deploymentId: this.deploymentId,
    };

    if (message instanceof Error) {
      const error: SerializableError = {
        name: message.name,
        message: message.message,
        stack: message.stack,
      };
      logEntry = {
        ...baseEntry,
        message: message.name,
        error,
        ...restOptions,
      };
    } else if (typeof message === 'string') {
      logEntry = {
        ...baseEntry,
        message,
        ...restOptions,
      };
    } else {
      // If message is an object, it's part of the log entry
      logEntry = {
        ...baseEntry,
        ...(message as Record<string, unknown>),
        message: (message as { message?: string }).message || 'Structured log data',
        ...restOptions,
      };
    }

    // Separate the message from the log data and explicitly exclude any level field
    const { message: logMessage, level: excludedLevel, ...logData } = logEntry as any;
    this.logger[level](logData, logMessage);
    
    return logEntry as Log;
  }

  /**
   * Logs an error message
   * @param message - Error message or object
   * @param options - Additional logging options
   */
  error(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): Log {
    return this.log('error', message, options);
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param options - Additional logging options
   */
  warn(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): Log {
    return this.log('warn', message, options);
  }

  /**
   * Logs an info message
   * @param message - Info message
   * @param options - Additional logging options
   */
  info(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): Log {
    return this.log('info', message, options);
  }

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param options - Additional logging options
   */
  debug(message: string | Error | Record<string, unknown>, options: GeneralLogOptions = {}): Log {
    return this.log('debug', message, options);
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

    // Check if we have a workflow URL configured (preferred method)
    if (this.workflowUrl) {
      // Use workflow URL as the base URL
      return `${this.workflowUrl.replace(/\/$/, '')}${reqUrl}`;
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
  httpRequest(req: Request, options: HttpRequestLogOptions = {}): HttpRequestLog {
    const logId = uuidv4();
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();
    const startTime = options.startTime || Date.now();

    // Store request metadata in res.locals for later use
    if (req.res) {
      req.res.locals.requestId = requestId;
      req.res.locals.startTime = startTime;
      req.res.locals.traceId = traceId;
      req.res.locals.workflowId = this.workflowId;
      req.res.locals.workflowUrl = this.workflowUrl;
      req.res.locals.serviceId = this.serviceId;
    }

    const logEntry: Omit<HttpRequestLog, 'level'> & { [key: string]: any } = {
      logId,
      type: 'httpRequest',
      message: req.ip === 'outgoing' ? 'Outgoing HTTP Request' : 'Incoming HTTP Request',
      workflowId: this.workflowId,
      serviceId: this.serviceId,
      traceId,
      requestId,
      deploymentId: this.deploymentId,
      duration: 0, // Will be updated in response
      httpRequest: {
        url: this.constructFullUrl(req),
        method: req.method,
        headers: filterHeaders(req.headers),
        ip: normalizeIp(req.ip),
        body: safeJsonParse(req.body),
      },
    };

    const { message: logMessage, ...logData } = logEntry;
    this.logger[options.level || 'info'](logData, logMessage);
    
    return logEntry as unknown as HttpRequestLog;
  }

  /**
   * Logs an HTTP response
   * @param res - Express response object
   * @param req - Express request object
   * @param options - Additional logging options
   */
  httpResponse(res: Response, req: Request, options: HttpResponseLogOptions = {}): HttpResponseLog {
    const logId = uuidv4();
    const requestId = res.locals.requestId || options.requestId || uuidv4();
    const startTime = res.locals.startTime || options.startTime || Date.now();
    const workflowId = res.locals.workflowId || this.workflowId;
    const serviceId = res.locals.serviceId || this.serviceId;
    const traceId = res.locals.traceId || options.traceId || traceContext.getTraceId() || uuidv4();
    const duration = options.duration || (Date.now() - startTime);

    // Determine log level based on status code
    let level: LogLevel = options.level || 'info';
    if (!options.level) {
      if (res.statusCode >= 400) {
        level = 'error';
      } else {
        level = 'info';
      }
    }

    const logEntry: Omit<HttpResponseLog, 'level'> & { [key: string]: any } = {
      logId,
      type: 'httpResponse',
      message: getStatusMessage(res.statusCode),
      workflowId: workflowId || '',
      serviceId: serviceId || '',
      traceId,
      requestId,
      deploymentId: this.deploymentId,
      duration,
      httpResponse: {
        url: this.constructFullUrl(req),
        method: req.method,
        headers: filterHeaders(res.getHeaders()),
        ip: normalizeIp(req.ip),
        status: res.statusCode,
        body: safeJsonParse(res.locals.body),
      },
    };

    const { message: logMessage, ...logData } = logEntry;
    this.logger[level](logData, logMessage);
    
    return logEntry as unknown as HttpResponseLog;
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
  ): SftpTransactionLog {
    const logId = uuidv4();
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();
    const duration = options.duration || (options.startTime ? Date.now() - options.startTime : 0);

    const level: LogLevel = operation.status === 'success' ? 'info' : 'error';

    const logEntry: Omit<SftpTransactionLog, 'level'> & { [key: string]: any } = {
      logId,
      type: 'sftpTransaction',
      message: `SFTP ${operation.operation} ${operation.status} - ${operation.path}`,
      workflowId: this.workflowId,
      serviceId: this.serviceId,
      traceId,
      requestId,
      deploymentId: this.deploymentId,
      duration,
      sftp: operation,
    };

    const { message: logMessage, ...logData } = logEntry;
    this.logger[level](logData, logMessage);
    
    return logEntry as unknown as SftpTransactionLog;
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
  ): DbQueryTransactionLog {
    const logId = uuidv4();
    const traceId = options.traceId || traceContext.getTraceId() || uuidv4();
    const requestId = options.requestId || uuidv4();
    const duration = options.duration || (options.startTime ? Date.now() - options.startTime : 0);

    const level: LogLevel = query.status === 'success' ? 'info' : 'error';

    const logEntry: Omit<DbQueryTransactionLog, 'level'> & { [key: string]: any } = {
      logId,
      type: 'dbQueryTransaction',
      message: `DB Query ${query.status} - ${query.vendor}`,
      workflowId: this.workflowId,
      serviceId: this.serviceId,
      traceId,
      requestId,
      deploymentId: this.deploymentId,
      duration,
      db: query,
    };

    const { message: logMessage, ...logData } = logEntry;
    this.logger[level](logData, logMessage);
    
    return logEntry as unknown as DbQueryTransactionLog;
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
      const reqLog = this.httpRequest(req, { traceId });

      // Capture response body for logging
      const originalSend = res.send;
      res.send = function(body) {
        res.locals.body = body;
        return originalSend.call(this, body);
      };

      // Log the response when it finishes
      res.on('finish', () => {
        this.httpResponse(res, req, { requestId: reqLog.requestId, traceId });
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
        body: safeJsonParse(config.data),
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
      // Check if the URL should be ignored
      const url = `${response.config?.baseURL || ''}${response.config?.url}`;
      if (url && this.shouldIgnorePath(url, this.ignoreAxiosTraceRoutes)) {
        return response;
      }

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
          body: safeJsonParse(response.data),
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
      // Check if the URL should be ignored
      const url = `${error.config?.baseURL || ''}${error.config?.url}`;
      if (url && this.shouldIgnorePath(url, this.ignoreAxiosTraceRoutes)) {
        return Promise.reject(error);
      }

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
            body: safeJsonParse(error.response.data),
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
