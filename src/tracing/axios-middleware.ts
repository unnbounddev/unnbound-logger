import { AxiosRequestConfig } from 'axios';
import { traceContext } from './trace-context';

/**
 * Axios middleware that automatically adds the current trace ID to request headers
 * @returns Axios request interceptor
 */
export const axiosTraceMiddleware = {
  onFulfilled: (config: AxiosRequestConfig): AxiosRequestConfig => {
    const traceId = traceContext.getTraceId();
    if (traceId) {
      config.headers = {
        ...config.headers,
        'x-trace-id': traceId
      };
    }
    return config;
  },
  onRejected: (error: any): any => {
    return Promise.reject(error);
  }
};