/**
 * Utility functions for logging
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates the current timestamp in ISO format
 * @returns ISO timestamp string
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Stores trace IDs by workflow ID for consistent tracking
 */
const traceIdMap = new Map<string, string>();

/**
 * Gets or creates a trace ID for a workflow
 * @param workflowId - The workflow ID to get a trace ID for
 * @returns A trace ID associated with the workflow
 */
export function getTraceId(workflowId: string): string {
  if (!traceIdMap.has(workflowId)) {
    traceIdMap.set(workflowId, uuidv4());
  }
  return traceIdMap.get(workflowId) as string;
}

/**
 * Clears a trace ID from the map
 * @param workflowId - The workflow ID to clear
 */
export function clearTraceId(workflowId: string): void {
  traceIdMap.delete(workflowId);
}

// --- Header Allow-Listing ---
const ALLOWED_HEADERS = new Set([
    'content-type',
    'accept',
    'user-agent',
    'host',
    'x-forwarded-for',
    'x-request-id',
    'content-length',
    'cache-control',
  ]);
  
  /**
   * Filters an object of headers, returning a new object with only the allowed headers.
   * @param headers The original headers object.
   * @returns A new object containing only the headers from the allow-list.
   */
  export function filterHeaders(headers: Record<string, any>): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const key in headers) {
      if (ALLOWED_HEADERS.has(key.toLowerCase())) {
        filtered[key] = String(headers[key]);
      }
    }
    return filtered;
  }
  
  /**
   * Safely parses JSON strings, returning the original data if parsing fails or if it's not a string.
   * @param data The data to potentially parse as JSON.
   * @returns Parsed JSON object or the original data.
   */
  export function safeJsonParse(data: any): any {
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return data; }
    }
    return data;
  }
  
  /**
   * Normalizes IP addresses by removing IPv6 mapping prefix for IPv4 addresses.
   * @param ip The IP address to normalize.
   * @returns Normalized IP address string.
   */
  export function normalizeIp(ip: string | undefined): string | undefined {
    if (!ip) return ip;
    
    // Remove IPv4-mapped IPv6 prefix (::ffff:) to get clean IPv4 address
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    
    return ip;
  } 