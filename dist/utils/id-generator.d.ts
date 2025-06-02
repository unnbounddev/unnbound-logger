/**
 * Generates a new UUID v4
 * @returns A UUID v4 string
 */
export declare function generateUuid(): string;
/**
 * Generates the current timestamp in ISO format
 * @returns ISO timestamp string
 */
export declare function generateTimestamp(): string;
/**
 * Gets or creates a trace ID for a workflow
 * @param workflowId - The workflow ID to get a trace ID for
 * @returns A trace ID associated with the workflow
 */
export declare function getTraceId(workflowId: string): string;
/**
 * Clears a trace ID from the map
 * @param workflowId - The workflow ID to clear
 */
export declare function clearTraceId(workflowId: string): void;
