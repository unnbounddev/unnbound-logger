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

// Log with object messages (wrapped in 'data' field)
logger.info({
  event: 'user_login',
  userId: '123',
  timestamp: new Date().toISOString()
});
// Results in: { "data": { "event": "user_login", "userId": "123", "timestamp": "..." }, "message": "Structured log data", ... }

// Log with both string message and metadata (metadata added to top level)
logger.info('User logged in', {
  userId: '123',
  timestamp: new Date().toISOString()
});
// Results in: { "userId": "123", "timestamp": "...", "message": "User logged in", ... }

// Log with object message and additional metadata
logger.info(
  { event: 'user_login', userId: '123' },
  { timestamp: new Date().toISOString() }
);
// Results in: { "data": { "event": "user_login", "userId": "123" }, "timestamp": "...", "message": "Structured log data", ... }
```

## Log Format

All logs follow a standardized format:

```typescript
interface Log<T extends LogType = 'general'> {
  logId: string; // Unique identifier for each log entry
  level: LogLevel; // "info" | "debug" | "error" | "warn"
  type: T; // "general" | "httpRequest" | "httpResponse" | "sftpTransaction" | "dbQueryTransaction"
  message: string;
  workflowId: string;
  serviceId: string;
  traceId: string;
  requestId: string;
  deploymentId: string; // Automatically populated from UNNBOUND_DEPLOYMENT_ID
  error?: SerializableError; // Only present for Error objects
}

interface LogTransaction<T extends LogType> extends Log<T> {
  duration: number; // Duration in milliseconds
}
```

## Workflow and Deployment Tracking

### Workflow Tracking

The logger includes a `workflowId` field in all log entries for tracking operations across services:

```bash
# Set the workflow ID in your environment
export UNNBOUND_WORKFLOW_ID="order-processing-12345"
export UNNBOUND_WORKFLOW_URL="https://workflows.example.com/order-processing-12345"
export UNNBOUND_SERVICE_ID="order-service"

# Or in your deployment configuration  
UNNBOUND_WORKFLOW_ID=order-processing-12345
UNNBOUND_WORKFLOW_URL=https://workflows.example.com/order-processing-12345
UNNBOUND_SERVICE_ID=order-service
```

```typescript
// Create a logger - workflowId and serviceId are automatically set from environment
const logger = new UnnboundLogger();
```

### Deployment Tracking

The logger automatically includes a `deploymentId` field in all log entries. This field is populated from the `UNNBOUND_DEPLOYMENT_ID` environment variable, allowing you to track logs per deployment.

```bash
# Set the deployment ID in your environment
export UNNBOUND_DEPLOYMENT_ID="v1.2.3-prod-20231201"

# Or in your deployment configuration
UNNBOUND_DEPLOYMENT_ID=v1.2.3-prod-20231201
```

If the environment variables are not set, the fields will be empty strings. These fields help with:

- **Workflow ID**: Unique identifier for the workflow (logged in each entry)
- **Workflow URL**: Used internally for URL construction in webhook endpoints (not logged as a field)
- **Service ID**: Identifier for the specific service/component (logged in each entry)
- **Deployment ID**: Tracking logs across different application deployments (logged in each entry)
- **Correlating issues**: Link problems to specific workflows and releases
- **Monitoring**: Track health and performance across workflows and deployments

## Object Logging Behavior

The logger handles different message types differently to ensure consistent structure in your logs:

### String Messages with Metadata
When you pass a string message with additional metadata, the metadata is wrapped in a `data` field:

```typescript
logger.info('User action completed', { userId: '123', action: 'login' });
// Result: { "message": "User action completed", "data": { "userId": "123", "action": "login" }, ... }
```

### Object Messages
When you pass an object as the message, it gets wrapped in a `data` field to prevent unknown properties from polluting the top level:

```typescript
logger.info({ userId: '123', action: 'login', timestamp: '2025-01-01T12:00:00Z' });
// Result: { "message": "Structured log data", "data": { "userId": "123", "action": "login", "timestamp": "2025-01-01T12:00:00Z" }, ... }
```

If the object contains a `message` property, it remains in the `data` object and doesn't affect the top-level message:

```typescript
logger.info({ message: 'Custom message', userId: '123' });
// Result: { "message": "Structured log data", "data": { "message": "Custom message", "userId": "123" }, ... }
```

### Error Objects
Error objects are handled specially and include serialized error information:

```typescript
logger.error(new Error('Something went wrong'));
// Result: { "message": "Error", "error": { "name": "Error", "message": "Something went wrong", "stack": "..." }, ... }
```

This structure ensures your UI can reliably access all object data through the `data` field without worrying about unknown properties at the top level. Whether you pass an object as the message or as metadata, it will always be contained within the `data` field.

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

### Full URL Logging for Webhook Endpoints

When webhook endpoints receive incoming requests, the logger automatically constructs and logs the full URL using a smart fallback strategy:

1. **Preferred: Uses `UNNBOUND_WORKFLOW_URL`** - If set, this becomes the base URL for all logged requests
2. **Fallback: Constructs from request headers** - Uses protocol, host, and forwarded headers from the incoming request

```bash
# Set your workflow URL to ensure full URLs in logs
export UNNBOUND_WORKFLOW_URL="https://api.yourservice.com"

# Example webhook endpoints will be logged as:
# POST https://api.yourservice.com/webhooks/stripe
# POST https://api.yourservice.com/webhooks/github
```

```typescript
import express from 'express';
import { UnnboundLogger } from 'unnbound-logger';

const app = express();
const logger = new UnnboundLogger();

// Apply trace middleware for automatic logging
app.use(logger.traceMiddleware);

// Webhook endpoints - URLs automatically logged with full domain
app.post('/webhooks/stripe', (req, res) => {
  // Request logged as: https://api.yourservice.com/webhooks/stripe
  res.status(200).send('OK');
});

app.post('/webhooks/github', (req, res) => {
  // Request logged as: https://api.yourservice.com/webhooks/github
  res.status(200).send('OK');
});
```

This ensures webhook logs contain the complete URL for easy debugging and monitoring.

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

**LoggerOptions:**
- `traceHeaderKey?: string` - Custom trace header name (default: 'unnbound-trace-id')
- `ignoreTraceRoutes?: string[]` - Routes to ignore in Express middleware
- `ignoreAxiosTraceRoutes?: string[]` - Routes to ignore in Axios middleware

**Note:** `workflowId`, `serviceId`, and `deploymentId` are configured via environment variables (`UNNBOUND_WORKFLOW_ID`, `UNNBOUND_SERVICE_ID`, `UNNBOUND_DEPLOYMENT_ID`). The `UNNBOUND_WORKFLOW_URL` is used for URL construction in webhook endpoints.

#### Methods

- `log(level: LogLevel, message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): Log`
- `error(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): Log`
- `warn(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): Log`
- `info(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): Log`
- `debug(message: string | Error | Record<string, unknown>, options?: GeneralLogOptions): Log`
- `httpRequest(req: Request, options?: HttpRequestLogOptions): HttpRequestLog`
- `httpResponse(res: Response, req: Request, options: HttpResponseLogOptions): HttpResponseLog`
- `sftpTransaction(operation: SftpOperation, options?: SftpTransactionLogOptions): SftpTransactionLog`
- `dbQueryTransaction(query: DbQuery, options?: DbQueryTransactionLogOptions): DbQueryTransactionLog`