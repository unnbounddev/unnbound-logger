import { Logger as WinstonLogger, createLogger, format, transports } from 'winston';
import { LoggingEngine, LogLevel } from '../types';

/**
 * Winston adapter for the LoggingEngine interface
 */
export class WinstonAdapter implements LoggingEngine {
  private logger: WinstonLogger;

  constructor(options: {
    level?: LogLevel;
    transports?: Array<WinstonLogger['transports'][number]>;
    serviceName?: string;
    environment?: string;
  } = {}) {
    this.logger = createLogger({
      level: options.level || 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      defaultMeta: {
        ...(options.serviceName && { service: options.serviceName }),
        ...(options.environment && { environment: options.environment }),
      },
      transports: options.transports || [new transports.Console()],
    });
  }

  log(level: LogLevel, message: string | Record<string, unknown>, meta: Record<string, unknown>): void {
    if (typeof message === 'string') {
      this.logger.log(level, message, meta);
    } else {
      // If message is an object, merge it with meta
      this.logger.log(level, '', { ...message, ...meta });
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