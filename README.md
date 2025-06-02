# 🚀 Winston Structured Logger

A powerful, type-safe structured logging library built on top of Winston with TypeScript support. This library provides consistent, well-typed logging across different operational contexts including general logs, HTTP operations, and SFTP operations.

## ✨ Features

- 🛡️ Type-safe logging with TypeScript interfaces for all log types
- 📝 Structured log format with consistent fields across log types
- 🔍 Context-aware logging with support for trace and workflow IDs
- 🌐 Specialized logging for HTTP requests/responses and SFTP operations
- 🔑 UUID generation for log identification and request tracking
- ⚙️ Configurable logging levels and outputs
- 🎨 Multiple log formats (JSON, simple, pretty)
- 🔄 Automatic log level selection for HTTP responses based on status codes

## 📦 Installation

```bash
npm install unnbound-logger
```

## 🚀 Quick Start

```typescript
import { StructuredLogger } from 'unnbound-logger';

// Create a logger with default settings
const logger = new StructuredLogger();

// Log messages at different levels
logger.info('Application started');
logger.warn('Disk space is running low');
logger.error('Failed to connect to database');
logger.debug('Debug information', { key: 'value' });
```

## 📚 Usage Examples

### 🔄 Basic Logging

```typescript
import { StructuredLogger } from 'unnbound-logger';

const logger = new StructuredLogger();

// Simple string messages
logger.info('User logged in successfully');
logger.warn('High memory usage detected');

// Object logging
logger.info('User profile updated', {
  userId: '123',
  changes: ['email', 'avatar']
});

// Error logging with stack traces
try {
  // ... some code that might throw
} catch (error) {
  logger.error(error); // Automatically captures stack trace
}
```

### 🌐 HTTP Request/Response Logging

```typescript
import { StructuredLogger } from 'unnbound-logger';

const logger = new StructuredLogger();

// Log an HTTP request
const requestId = logger.httpRequest(
  'POST',
  'https://api.example.com/users',
  { name: 'John Doe', email: 'john@example.com' }
);

// Later, log the corresponding response
logger.httpResponse(
  'POST',
  'https://api.example.com/users',
  201,
  { id: '123', success: true },
  { requestId, duration: 150 }  // Duration in milliseconds
);

// Log an error response
logger.httpResponse(
  'GET',
  'https://api.example.com/users/999',
  404,
  { error: 'User not found' },
  { requestId, duration: 50 }
);
```

### 📂 SFTP Operation Logging

```typescript
import { StructuredLogger } from 'unnbound-logger';

const logger = new StructuredLogger();

// Log a file upload
logger.sftpOperation(
  'PUT',
  'sftp://sftp.example.com',
  '/uploads/data/',
  'report.csv',
  {
    duration: 2500,  // Duration in milliseconds
    fileSize: 1024000  // Size in bytes
  }
);

// Log a file download
logger.sftpOperation(
  'GET',
  'sftp://sftp.example.com',
  '/downloads/',
  'data.zip',
  {
    duration: 5000,
    fileSize: 5120000
  }
);
```

### ⚙️ Advanced Configuration

```typescript
import { StructuredLogger } from 'unnbound-logger';
import { transports, format } from 'winston';

// Create a logger with custom configuration
const logger = new StructuredLogger({
  defaultLevel: 'debug',
  serviceName: 'user-service',
  environment: 'production',
  format: 'pretty',  // 'json', 'simple', or 'pretty'
  transports: [
    new transports.Console(),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new transports.File({
      filename: 'logs/combined.log'
    })
  ]
});
```

### 🔄 Using Workflow and Trace IDs

```typescript
import {
  StructuredLogger,
  generateUuid
} from 'unnbound-logger';

const logger = new StructuredLogger();

// Create a workflow ID for a business process
const workflowId = generateUuid();

// Log messages in the same workflow
logger.info('Process started', { workflowId });

// Log an HTTP request in the same workflow
const requestId = logger.httpRequest(
  'GET',
  'https://api.example.com/data',
  null,
  { workflowId }
);

// Log the response in the same workflow
logger.httpResponse(
  'GET',
  'https://api.example.com/data',
  200,
  { data: [1, 2, 3] },
  { workflowId, requestId, duration: 120 }
);

// Complete the workflow
logger.info('Process completed successfully', { workflowId });
```

## 📋 Log Structure

All logs include these base fields:

- `logId`: UUID for the log entry
- `timestamp`: ISO timestamp
- `traceId`: UUID for distributed tracing
- `workflowId`: UUID for business process tracking
- `logLevel`: 'error', 'warn', 'info', or 'debug'
- `logType`: 'general', 'httpRequest', 'httpResponse', or 'sftpOperation'
- `message`: Log message content (string, object, or null)

### 🔍 Additional Fields by Log Type

#### HTTP Request Logs
- `requestId`: UUID for the HTTP request
- `method`: HTTP method
- `url`: Request URL

#### HTTP Response Logs
- `requestId`: UUID matching the request
- `method`: HTTP method
- `url`: Request URL
- `responseStatusCode`: HTTP status code
- `duration`: Request duration in milliseconds

#### SFTP Operation Logs
- `method`: SFTP operation type
- `url`: SFTP server URL
- `filePath`: Path to the file on the SFTP server
- `fileName`: Name of the file
- `fileSize`: Size of the file in bytes (optional)
- `duration`: Operation duration in milliseconds

## 📝 License

MIT

# Request-Scoped Logging with Trace IDs

A Node.js library for implementing request-scoped logging with trace IDs using AsyncLocalStorage. This library provides automatic trace ID propagation across async operations, HTTP requests, and logging.

## Features

- Request-scoped trace IDs using AsyncLocalStorage
- Automatic trace ID propagation in HTTP requests
- Winston logger integration with trace IDs
- Express middleware for trace ID handling
- Axios middleware for trace ID injection
- Support for custom Winston configurations

## Installation

```bash
npm install unnbound-logger
```

## Basic Usage

### Express Middleware Setup

```typescript
import express from 'express';
import { traceMiddleware, logger } from 'unnbound-logger';

const app = express();

// Add the trace middleware before your routes
app.use(traceMiddleware);

app.get('/api/example', (req, res) => {
  // Logs will automatically include the trace ID
  logger.info('Processing request', { path: req.path });
  res.json({ success: true });
});
```

### Using the Axios Middleware

```typescript
import axios from 'axios';
import { axiosTraceMiddleware, logger } from 'unnbound-logger';

// Create your Axios instance
const api = axios.create({
  baseURL: 'https://api.example.com'
});

// Add the trace middleware to your Axios instance
api.interceptors.request.use(
  axiosTraceMiddleware.onFulfilled,
  axiosTraceMiddleware.onRejected
);

async function makeApiCall() {
  try {
    // The trace ID will be automatically added to the request headers
    const response = await api.get('/data');
    logger.info('API call successful', { status: response.status });
  } catch (error) {
    logger.error('API call failed', { error });
  }
}
```

### Custom Winston Configuration

```typescript
import winston from 'winston';
import { traceFormat } from 'unnbound-logger';

const customLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    traceFormat, // Add trace ID to all logs
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});
```

## Advanced Usage

### SFTP Connection Example

```typescript
import { Client } from 'ssh2';
import { logger, traceContext } from 'unnbound-logger';

async function sftpOperation() {
  const client = new Client();

  return new Promise((resolve, reject) => {
    client.on('ready', () => {
      logger.info('SFTP connection established');

      client.sftp((err, sftp) => {
        if (err) {
          logger.error('SFTP error', { error: err });
          reject(err);
          return;
        }

        sftp.readFile('/remote/path/file.txt', (err, data) => {
          if (err) {
            logger.error('File read error', { error: err });
            reject(err);
            return;
          }

          logger.info('File read successful', { size: data.length });
          resolve(data);
        });
      });
    });

    client.connect({
      host: 'sftp.example.com',
      username: 'user',
      password: 'password'
    });
  });
}
```

### Custom Trace Context Usage

```typescript
import { traceContext, logger } from 'unnbound-logger';

async function customOperation() {
  // Run a block of code with a specific trace ID
  await traceContext.run('custom-trace-id', async () => {
    logger.info('Starting operation');
    // All logs and HTTP requests will use this trace ID
    await someAsyncOperation();
    logger.info('Operation completed');
  });
}
```

### Error Handling

```typescript
import { logger } from 'unnbound-logger';

app.get('/api/error-example', async (req, res) => {
  try {
    // Your code here
    throw new Error('Something went wrong');
  } catch (error) {
    // Error logs will include the trace ID
    logger.error('Operation failed', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Configuration

### Environment Variables

- `LOG_LEVEL`: Set the logging level (default: 'info')
- `SERVICE_NAME`: Set the service name in logs (default: 'your-service-name')

### Customizing the Logger

```typescript
import { logger } from 'unnbound-logger';

// Add custom metadata to all logs
logger.defaultMeta = {
  ...logger.defaultMeta,
  environment: process.env.NODE_ENV,
  version: '1.0.0'
};
```

## Best Practices

1. Always use the `traceMiddleware` as early as possible in your Express application
2. Add the `axiosTraceMiddleware` to your Axios instances to maintain trace context
3. Include relevant context in log messages (e.g., request IDs, user IDs)
4. Use appropriate log levels (error, warn, info, debug)
5. Structure log messages consistently for better parsing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT