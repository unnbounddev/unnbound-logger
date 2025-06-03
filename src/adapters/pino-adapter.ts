import pino from 'pino';
import { LoggingEngine, LogLevel } from '../types';
import { traceContext } from '../utils/trace-context';

/**
 * Pino adapter for the LoggingEngine interface
 */
export class PinoAdapter implements LoggingEngine {
  private logger: pino.Logger;

  constructor(options: {
    level?: LogLevel;
    serviceName?: string;
    environment?: string;
  } = {}) {
    this.logger = pino({
      level: options.level || 'info',
      base: {
        ...(options.serviceName && { service: options.serviceName }),
        ...(options.environment && { environment: options.environment }),
      },
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    });
  }

  log(level: LogLevel, message: string | Record<string, unknown>, meta: Record<string, unknown>): void {
    const traceId = traceContext.getTraceId();
    const logData = {
      ...meta,
      ...(traceId && { traceId }),
    };

    if (typeof message === 'string') {
      this.logger[level](logData, message);
    } else {
      // If message is an object, merge it with meta
      this.logger[level]({ ...message, ...logData });
    }
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