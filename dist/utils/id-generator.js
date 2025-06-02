"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUuid = generateUuid;
exports.generateTimestamp = generateTimestamp;
exports.getTraceId = getTraceId;
exports.clearTraceId = clearTraceId;
/**
 * Utilities for generating unique identifiers
 */
const uuid_1 = require("uuid");
/**
 * Generates a new UUID v4
 * @returns A UUID v4 string
 */
function generateUuid() {
    return (0, uuid_1.v4)();
}
/**
 * Generates the current timestamp in ISO format
 * @returns ISO timestamp string
 */
function generateTimestamp() {
    return new Date().toISOString();
}
/**
 * Stores trace IDs by workflow ID for consistent tracking
 */
const traceIdMap = new Map();
/**
 * Gets or creates a trace ID for a workflow
 * @param workflowId - The workflow ID to get a trace ID for
 * @returns A trace ID associated with the workflow
 */
function getTraceId(workflowId) {
    if (!traceIdMap.has(workflowId)) {
        traceIdMap.set(workflowId, generateUuid());
    }
    return traceIdMap.get(workflowId);
}
/**
 * Clears a trace ID from the map
 * @param workflowId - The workflow ID to clear
 */
function clearTraceId(workflowId) {
    traceIdMap.delete(workflowId);
}
