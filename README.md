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
npm install winston-structured-logger
```

## 🚀 Quick Start

```typescript
import { StructuredLogger } from 'winston-structured-logger';

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
import { StructuredLogger } from 'winston-structured-logger';

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
import { StructuredLogger } from 'winston-structured-logger';

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
import { StructuredLogger } from 'winston-structured-logger';

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
import { StructuredLogger } from 'winston-structured-logger';
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
} from 'winston-structured-logger';

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