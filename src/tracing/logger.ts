import winston from 'winston';
import { traceFormat } from './index';

const { combine, timestamp, json } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    traceFormat,
    json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});