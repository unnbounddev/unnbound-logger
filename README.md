# Winston Structured Logger

A structured logging library built on top of Winston with TypeScript support. This library provides consistent, well-typed logging across different operational contexts including general logs, HTTP operations, and SFTP operations.

## Features

- Type-safe logging with TypeScript interfaces for all log types
- Structured log format with consistent fields across log types
- Context-aware logging with support for trace and workflow IDs
- Specialized logging for HTTP requests/responses and SFTP operations
- UUID generation for log identification and request tracking
- Configurable logging levels and outputs

## Installation

```bash
npm install winston-structured-logger
```

## Usage

### Basic Usage

```typescript
import { StructuredLogger } from 'winston-structured-logger';

// Create a logger
const logger = new StructuredLogger();

// Log messages at different levels
logger.info('Application started');
logger.warn('Disk space is running low');
logger.error('Failed to connect to database');
logger.debug('Debug information', { key: 'value' });
```

### Log HTTP Requests and Responses

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
```

### Log SFTP Operations

```typescript
import { StructuredLogger } from 'winston-structured-logger';

const logger = new StructuredLogger();

// Log an SFTP operation
logger.sftpOperation(
  'PUT',
  'sftp://sftp.example.com',
  '/uploads/data/',
  'report.csv',
  { duration: 2500, fileSize: 1024000 }  // Duration in ms, size in bytes
);
```

### Advanced Configuration

```typescript
import { StructuredLogger } from 'winston-structured-logger';
import { transports, format } from 'winston';

// Create a logger with custom configuration
const logger = new StructuredLogger({
  defaultLevel: 'debug',
  serviceName: 'user-service',
  environment: 'production',
  format: 'pretty',
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Using Workflow and Trace IDs

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

## API Reference

### StructuredLogger Class

The main class for logging operations.

#### Constructor

```typescript
constructor(options?: LoggerOptions)
```

##### LoggerOptions

- `defaultLevel?: LogLevel` - Default log level ('error', 'warn', 'info', 'debug')
- `winstonLogger?: WinstonLogger` - Custom Winston logger instance
- `transports?: any[]` - Winston transport configurations
- `format?: 'json' | 'simple' | 'pretty'` - Log format
- `serviceName?: string` - Optional service name to include in logs
- `environment?: string` - Optional environment name to include in logs

#### Methods

##### General Logging

```typescript
log(level: LogLevel, message: string | Record<string, any>, options?: GeneralLogOptions): void
error(message: string | Error | Record<string, any>, options?: GeneralLogOptions): void
warn(message: string | Record<string, any>, options?: GeneralLogOptions): void
info(message: string | Record<string, any>, options?: GeneralLogOptions): void
debug(message: string | Record<string, any>, options?: GeneralLogOptions): void
```

##### HTTP Request Logging

```typescript
httpRequest(
  method: HttpMethod,
  url: string,
  body?: Record<string, any> | null,
  options?: HttpRequestLogOptions
): string
```

##### HTTP Response Logging

```typescript
httpResponse(
  method: HttpMethod,
  url: string,
  statusCode: number,
  body?: Record<string, any> | null,
  options: HttpResponseLogOptions
): void
```

##### SFTP Operation Logging

```typescript
sftpOperation(
  method: SftpMethod,
  url: string,
  filePath: string,
  fileName: string,
  options: SftpOperationLogOptions
): void
```

### Utility Functions

- `generateUuid(): string` - Generate a new UUID v4
- `generateTimestamp(): string` - Generate current ISO timestamp
- `getTraceId(workflowId: string): string` - Get or create a trace ID for a workflow
- `clearTraceId(workflowId: string): void` - Clear a trace ID from the internal map

## Log Structure

All logs include these base fields:

- `logId`: UUID for the log entry
- `timestamp`: ISO timestamp
- `traceId`: UUID for distributed tracing
- `workflowId`: UUID for business process tracking
- `logLevel`: 'error', 'warn', 'info', or 'debug'
- `logType`: 'general', 'httpRequest', 'httpResponse', or 'sftpOperation'
- `message`: Log message content (string, object, or null)

Additional fields based on log type:

### HTTP Request Logs

- `requestId`: UUID for the HTTP request
- `method`: HTTP method
- `url`: Request URL

### HTTP Response Logs

- `requestId`: UUID matching the request
- `method`: HTTP method
- `url`: Request URL
- `responseStatusCode`: HTTP status code
- `duration`: Request duration in milliseconds

### SFTP Operation Logs

- `method`: SFTP operation type
- `url`: SFTP server URL
- `filePath`: Path to the file on the SFTP server
- `fileName`: Name of the file
- `fileSize`: Size of the file in bytes (optional)
- `duration`: Operation duration in milliseconds

## License

MIT