# Unnbound Logger

A structured logging library with TypeScript support. Provides consistent, well-typed logging across different operational contexts. All logs are output in JSON format for better machine readability and parsing.

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

## Using Different Logging Engines

Unnbound Logger supports multiple logging engines through adapters. By default, it uses Winston, but you can use other logging libraries like Pino. All logs are output in JSON format regardless of the engine used:

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import { PinoAdapter } from 'unnbound-logger/adapters';

// Create a logger with Pino
const logger = new UnnboundLogger({
  engine: new PinoAdapter({
    level: 'info',
    serviceName: 'my-service',
    environment: 'development'
  })
});

// Use the logger with both string and object messages
logger.info('Application started');
logger.info({ event: 'startup', version: '1.0.0' });
logger.info('User action', { userId: '123', action: 'login' });
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
- Request method, URL, body, query parameters, and headers
- Response status code, body, and headers
- Request duration
- Trace ID and workflow ID (if configured)

## Middleware Usage

### Express Trace Middleware

The library provides a trace middleware for Express applications that automatically logs HTTP requests and maintains trace context:

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import express from 'express';

const app = express();
const logger = new UnnboundLogger();

// Apply the trace middleware globally
app.use(logger.traceMiddleware);

```

The trace middleware automatically:
- Logs incoming requests with method, URL, headers, and body
- Generates and maintains trace IDs across the request lifecycle
- Measures request duration
- Handles errors and logs them appropriately

### Axios Trace Middleware

For logging outgoing HTTP requests made with Axios:

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import axios from 'axios';

const logger = new UnnboundLogger();

// Add Axios trace middleware
axios.interceptors.request.use(
  logger.axiosTraceMiddleware.onFulfilled,
  logger.axiosTraceMiddleware.onRejected
);

// All requests made with axios will be automatically logged
axios.get('https://api.example.com/data');
```

The Axios trace middleware:
- Logs outgoing requests with method, URL, headers, and body
- Maintains trace context across requests
- Handles errors and logs them appropriately
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

## Custom Configuration

```typescript
import { UnnboundLogger } from 'unnbound-logger';
import winston from 'winston';

// Using Winston
const logger = new UnnboundLogger({
  defaultLevel: 'debug',
  serviceName: 'my-service',
  environment: 'development',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Using Pino
import { PinoAdapter } from 'unnbound-logger/adapters';
const pinoLogger = new UnnboundLogger({
  engine: new PinoAdapter({
    level: 'debug',
    serviceName: 'my-service',
    environment: 'development'
  })
});

// Configure route filtering for trace middleware
const loggerWithRouteFiltering = new UnnboundLogger({
  // Routes to ignore in trace middleware (supports glob patterns)
  ignoreTraceRoutes: [
    '/health',           // Ignore exact path
    '/metrics/*',        // Ignore all paths under metrics
    '/static/*.js',      // Ignore all JS files in static directory
    '/api/v1/status'     // Ignore specific API endpoint
  ],
  // Routes to ignore in axios trace middleware (supports glob patterns)
  ignoreAxiosTraceRoutes: [
    'https://api.example.com/health',  // Ignore specific external API
    'https://metrics.*.com/*'          // Ignore all metrics endpoints
  ]
});
```

The route filtering options support glob patterns:
- `*` matches any sequence of characters
- `?` matches any single character
- `.` matches literal dots
- Patterns are matched against the full path/URL

## Creating Custom Logging Engines

You can create your own logging engine by implementing the `LoggingEngine` interface. All logs must be output in JSON format and support both string and object messages:

```typescript
import { LoggingEngine, LogLevel } from 'unnbound-logger';

class CustomLoggingEngine implements LoggingEngine {
  log(level: LogLevel, message: string | Record<string, unknown>, meta: Record<string, unknown>): void {
    // Implement your logging logic
    // Must output logs in JSON format
    // Must handle both string and object messages
  }

  error(message: string | Record<string, unknown>, meta: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  warn(message: string | Record<string, unknown>, meta: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  info(message: string | Record<string, unknown>, meta: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  debug(message: string | Record<string, unknown>, meta: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }
}

// Use your custom engine
const logger = new UnnboundLogger({
  engine: new CustomLoggingEngine()
});
```

## API Reference

### UnnboundLogger

The main logger class that provides all logging functionality.

#### Constructor

```typescript
new UnnboundLogger(options?: LoggerOptions)
```

#### Methods

- `log(level: LogLevel, message: string | Record<string, unknown>, options?: GeneralLogOptions): void`
- `error(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): void`
- `warn(message: string | Record<string, unknown>, options?: GeneralLogOptions): void`
- `info(message: string | Record<string, unknown>, options?: GeneralLogOptions): void`
- `debug(message: string | Record<string, unknown>, options?: GeneralLogOptions): void`
- `httpRequest(method: HttpMethod, url: string, body?: Record<string, unknown>, options?: HttpRequestLogOptions): string`
- `httpResponse(method: HttpMethod, url: string, statusCode: number, body?: Record<string, unknown>, options: HttpResponseLogOptions): void`