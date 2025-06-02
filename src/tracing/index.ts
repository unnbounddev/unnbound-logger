import winston from 'winston';
import { traceContext } from './trace-context';
export { traceContext } from './trace-context';
export { traceMiddleware } from './trace-middleware';
export { logger } from './logger';
export { axiosTraceMiddleware } from './axios-middleware';

// Export the trace format for custom Winston configurations
export const traceFormat = winston.format((info: any) => {
  const traceId = traceContext.getTraceId();
  if (traceId) {
    info.traceId = traceId;
  }
  return info;
})();