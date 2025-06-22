/**
 * Type definitions for structured logging library
 */

/**
 * Available log levels
 */
export type LogLevel = "info" | "debug" | "error" | "warn";

/**
 * Available log types
 */
export type LogType = "general" | "httpRequest" | "httpResponse" | "sftpTransaction" | "dbQueryTransaction";

/**
 * HTTP methods supported for HTTP logging
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface SerializableError {
  name: string;
  message: string;
  stack?: string;
}

export interface Log<T extends LogType = 'general'> {
  logId: string;
  level: LogLevel;
  type: T;
  message: string;
  serviceId: string;
  deploymentId: string;
  workflowId: string;
  traceId: string;
  requestId: string;
  // spanId?: string; // To be added later
  error?: SerializableError;
}

export interface LogTransaction<T extends LogType> extends Log<T> {
  duration: number;
}

export interface HttpRequestLog extends LogTransaction<'httpRequest'> {
  httpRequest: {
    url: string;
    method: string;
    headers: Record<string, string>;
    ip?: string;
    body?: unknown;
  };
}

export interface HttpResponseLog extends LogTransaction<'httpResponse'> {
  httpResponse: {
    url: string;
    method: string;
    headers: Record<string, string>;
    ip?: string;
    status: number;
    body?: unknown;
  };
}

export interface SftpTransactionLog extends LogTransaction<'sftpTransaction'> {
  sftp: {
    host: string;
    username: string;
    operation: 'upload' | 'download' | 'list' | 'delete' | 'rename' | 'stat';
    path: string;
    status: 'success' | 'failure';
    bytesTransferred?: number; // For upload/download
    filesListed?: number;      // For list operations
    sourcePath?: string;       // Specifically for 'rename' operations
  };
}

export interface DbQueryTransactionLog extends LogTransaction<'dbQueryTransaction'> {
  db: {
    instance: string; // e.g., the DB host or a connection pool name
    vendor: 'postgres' | 'mysql' | 'mssql' | 'mongodb';
    query?: string; // sanitized query without password
    status: 'success' | 'failure';
    rowsReturned?: number;   // For SELECT statements
    rowsAffected?: number;   // For INSERT, UPDATE, DELETE statements
  };
}

/**
 * Configuration options for the logger
 */
export interface LoggerOptions {
  /** Optional trace header key */
  traceHeaderKey?: string;
  /** Routes to ignore in trace middleware (supports glob patterns) */
  ignoreTraceRoutes?: string[];
  /** Routes to ignore in axios trace middleware (supports glob patterns) */
  ignoreAxiosTraceRoutes?: string[];
}

/**
 * Options for general logs
 */
export interface GeneralLogOptions {
  /** Log level override */
  level?: LogLevel;
  /** Custom trace ID */
  traceId?: string;
  /** Custom request ID */
  requestId?: string;
  /** Custom metadata */
  [key: string]: unknown;
}

/**
 * Options for HTTP request logs
 */
export interface HttpRequestLogOptions extends GeneralLogOptions {
  /** Start time of the request for duration calculation */
  startTime?: number;
}

/**
 * Options for HTTP response logs
 */
export interface HttpResponseLogOptions extends HttpRequestLogOptions {
  /** Duration of the request in milliseconds */
  duration?: number;
}

/**
 * Options for SFTP transaction logs
 */
export interface SftpTransactionLogOptions extends GeneralLogOptions {
  /** Start time of the transaction for duration calculation */
  startTime?: number;
  /** Duration of the transaction in milliseconds */
  duration?: number;
}

/**
 * Options for database query transaction logs
 */
export interface DbQueryTransactionLogOptions extends GeneralLogOptions {
  /** Start time of the query for duration calculation */
  startTime?: number;
  /** Duration of the query in milliseconds */
  duration?: number;
}
