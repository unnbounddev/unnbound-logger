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

const logger = new UnnboundLogger();

// Log HTTP request with object message
const requestId = logger.httpRequest('POST', 'https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// Log HTTP response with object message
logger.httpResponse(
  'POST',
  'https://api.example.com/users',
  201,
  { id: '123', status: 'created' },
  { requestId, duration: 150 }
);
```

## SFTP Operation Logging

```typescript
import { UnnboundLogger } from 'unnbound-logger';

const logger = new UnnboundLogger();

// Log SFTP operation with object message
logger.sftpOperation(
  'PUT',
  'sftp://example.com',
  '/uploads',
  'document.pdf',
  { duration: 250, fileSize: 1024 }
);
```

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
```

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
- `sftpOperation(method: SftpMethod, url: string, filePath: string, fileName: string, options: SftpOperationLogOptions): void`

## License

MIT