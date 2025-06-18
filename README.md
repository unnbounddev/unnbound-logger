# Unnbound Logger

A structured logging library with TypeScript support built on Pino. Provides consistent, well-typed logging across different operational contexts. All logs are output in JSON format for better machine readability and parsing.

## Installation

```bash
npm install unnbound-logger
```

## Basic Usage

```typescript
import { UnnboundLogger } from 'unnbound-logger';

// Create a new logger instance
const logger = new UnnboundLogger();

// Log with string messages
logger.info('Application started');
logger.warn('Resource usage high');
logger.error(new Error('Database connection failed'));
logger.debug('Debug information');

// Log with object messages
logger.info({
  event: 'user_login',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Log with both string message and metadata
logger.info('User logged in', {
  userId: '123',
  timestamp: new Date().toISOString()
});

// Log with object message and additional metadata
logger.info(
  { event: 'user_login', userId: '123' },
  { timestamp: new Date().toISOString() }
);
```

## Log Format

All logs follow a standardized format:

```typescript
interface Log<T extends LogType = 'general'> {
  level: LogLevel; // "info" | "debug" | "error" | "warn"
  type: T; // "general" | "httpRequest" | "httpResponse" | "sftpTransaction" | "dbQueryTransaction"
  message: string;
  traceId: string;
  requestId: string;
  error?: SerializableError; // Only present for Error objects
}

interface LogTransaction<T extends LogType> extends Log<T> {
  duration: number; // Duration in milliseconds
}
```

## HTTP Request/Response Logging

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import express from 'express';

const app = express();
const logger = new UnnboundLogger();

// Middleware to log requests
app.use((req, res, next) => {
  // Log the request and get the request ID
  const requestId = logger.httpRequest(req, {
    startTime: Date.now()
  });

  // Store the request ID in res.locals for later use
  res.locals.requestId = requestId;

  // Add response listener to log the response
  res.on('finish', () => {
    logger.httpResponse(res, req, {
      requestId,
      startTime: res.locals.startTime
    });
  });

  next();
});

// Example route
app.post('/api/users', (req, res) => {
  // Your route handler code here
  res.status(201).json({ id: '123', status: 'created' });
});
```

The logger automatically captures:
- Request method, URL, body, and headers (filtered for security)
- Response status code, body, and headers (filtered for security)
- Request duration
- Trace ID and request ID for correlation

## SFTP Transaction Logging

For logging SFTP operations:

```typescript
import { UnnboundLogger } from 'unnbound-logger';

const logger = new UnnboundLogger();

// Log an SFTP upload
logger.sftpTransaction({
  host: 'sftp.example.com',
  username: 'ftpuser',
  operation: 'upload',
  path: '/uploads/file.txt',
  status: 'success',
  bytesTransferred: 1024
});

// Log an SFTP download with failure
logger.sftpTransaction({
  host: 'sftp.example.com',
  username: 'ftpuser',
  operation: 'download',
  path: '/downloads/file.txt',
  status: 'failure'
}, {
  startTime: Date.now() - 5000 // Started 5 seconds ago
});
```

## Database Query Transaction Logging

For logging database operations:

```typescript
import { UnnboundLogger } from 'unnbound-logger';

const logger = new UnnboundLogger();

// Log a successful database query
logger.dbQueryTransaction({
  instance: 'localhost:5432',
  vendor: 'postgres',
  query: 'SELECT * FROM users WHERE active = true',
  status: 'success',
  rowsReturned: 150
});

// Log a failed database operation
logger.dbQueryTransaction({
  instance: 'prod-db-cluster',
  vendor: 'mysql',
  query: 'UPDATE users SET last_login = NOW()',
  status: 'failure',
  rowsAffected: 0
}, {
  duration: 2500 // Operation took 2.5 seconds
});
```

## Middleware Usage

### Express Trace Middleware

The library provides a comprehensive trace middleware for Express applications that automatically handles trace context and HTTP logging:

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import express from 'express';

const app = express();
const logger = new UnnboundLogger();

// Apply the comprehensive trace middleware globally
app.use(logger.traceMiddleware);
```

The trace middleware automatically:
- Generates and maintains trace IDs across the request lifecycle
- Logs incoming requests with method, URL, headers, and body (filtered for security)
- Logs outgoing responses with status code, headers, body, and duration
- Measures request duration automatically
- Handles errors and logs them appropriately
- Captures response bodies for logging

### Axios Trace Middleware

For comprehensive logging of outgoing HTTP requests made with Axios:

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import axios from 'axios';

const logger = new UnnboundLogger();

// Add both request and response interceptors for complete HTTP logging
axios.interceptors.request.use(
  logger.axiosTraceMiddleware.onFulfilled,
  logger.axiosTraceMiddleware.onRejected
);

axios.interceptors.response.use(
  logger.axiosResponseInterceptor.onFulfilled,
  logger.axiosResponseInterceptor.onRejected
);

// All requests made with axios will be automatically logged
axios.get('https://api.example.com/data');
```

The Axios middleware:
- Logs outgoing requests with method, URL, headers, and body (filtered for security)
- Maintains trace context across requests by propagating trace IDs
- Logs successful responses with status, headers, body, and duration
- Logs error responses with detailed error information
- Supports request/response filtering through configuration

## Function Tracing with withTrace

The `withTrace` higher-order function allows you to wrap any function with automatic trace context. This is particularly useful for maintaining consistent trace IDs across async operations and distributed systems:

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import { withTrace } from 'unnbound-logger/utils/with-trace';
import { traceContext } from 'unnbound-logger/utils/trace-context';

const logger = new UnnboundLogger();

// Example: Wrapping a function with trace context
const operation = (value: number) => {
  const traceId = traceContext.getTraceId();
  logger.info('Processing value', { value, traceId });
  return value * 2;
};

// Wrap the function with trace context
const tracedOperation = withTrace(operation);

// Execute the function
const result = tracedOperation(21); // Returns 42
```

### Using Custom Trace IDs

You can provide your own trace ID when wrapping a function:

```typescript
const customTraceId = 'custom-trace-123';
const tracedOperation = withTrace(operation, customTraceId);
```

### Async Operations

The trace context is maintained across async operations:

```typescript
const asyncOperation = async (value: number) => {
  const traceId1 = traceContext.getTraceId();
  logger.info('First step', { traceId: traceId1 });

  await someAsyncWork();

  const traceId2 = traceContext.getTraceId();
  logger.info('Second step', { traceId: traceId2 });
  // traceId1 and traceId2 will be the same
};

const tracedOperation = withTrace(asyncOperation);
await tracedOperation(42);
```

### Benefits

- Automatic trace ID generation
- Consistent trace context across async operations
- Support for custom trace IDs
- Type-safe implementation
- Works with both sync and async functions
- Maintains separate trace contexts for different operations

> **Note:** When using `UnnboundLogger`, you don't need to manually call `traceContext.getTraceId()` in your logging calls. The logger automatically includes the current trace ID in all log entries. The example above shows manual trace ID retrieval for demonstration purposes, but in practice, you can simply use the logger methods directly:
>
> ```typescript
> const operation = (value: number) => {
>   logger.info('Processing value', { value }); // Trace ID is automatically included
>   return value * 2;
> };
> ```

## API Reference

### UnnboundLogger

The main logger class that provides all logging functionality using Pino.

#### Constructor

```typescript
new UnnboundLogger(options?: LoggerOptions)
```

#### Methods

- `log(level: LogLevel, message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): void`
- `error(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): void`
- `warn(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): void`
- `info(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): void`
- `debug(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): void`
- `httpRequest(req: Request, options?: HttpRequestLogOptions): string`
- `httpResponse(res: Response, req: Request, options: HttpResponseLogOptions): void`
- `sftpTransaction(operation: SftpOperation, options?: SftpTransactionLogOptions): void`
- `dbQueryTransaction(query: DbQuery, options?: DbQueryTransactionLogOptions): void`