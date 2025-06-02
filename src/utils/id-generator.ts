/**
 * Utilities for generating unique identifiers
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4
 * @returns A UUID v4 string
 */
export function generateUuid(): string {
  return uuidv4();
}

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
    traceIdMap.set(workflowId, generateUuid());
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