import { v4 as uuidv4 } from 'uuid';
import { traceContext } from './trace-context';

/**
 * Higher-order function that wraps a function with trace context
 * @param fn - Function to wrap with trace context
 * @param traceId - Optional trace ID to use (will generate new one if not provided)
 * @returns Wrapped function that maintains trace context
 */
export function withTrace<T extends (...args: any[]) => any>(fn: T, traceId?: string): T {
  const id = traceId || uuidv4();
  return ((...args: Parameters<T>): ReturnType<T> => {
    return traceContext.run(id, () => fn(...args));
  }) as T;
}