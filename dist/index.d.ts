/**
 * winston-structured-logger
 *
 * A structured logging library built on top of Winston with TypeScript support.
 * Provides consistent, well-typed logging across different operational contexts.
 */
import { StructuredLogger } from './logger';
import { LogLevel, LogType, HttpMethod, SftpMethod, LoggerOptions, GeneralLogOptions, HttpRequestLogOptions, HttpResponseLogOptions, SftpOperationLogOptions, BaseLogEntry, GeneralLogEntry, HttpRequestLogEntry, HttpResponseLogEntry, SftpOperationLogEntry, LogEntry } from './types';
import { generateUuid, generateTimestamp, getTraceId, clearTraceId } from './utils/id-generator';
export { StructuredLogger, LogLevel, LogType, HttpMethod, SftpMethod, LoggerOptions, GeneralLogOptions, HttpRequestLogOptions, HttpResponseLogOptions, SftpOperationLogOptions, BaseLogEntry, GeneralLogEntry, HttpRequestLogEntry, HttpResponseLogEntry, SftpOperationLogEntry, LogEntry, generateUuid, generateTimestamp, getTraceId, clearTraceId };
export declare const log: (level: LogLevel, message: string | Record<string, any>, options?: GeneralLogOptions) => void;
export declare const error: (message: string | Error | Record<string, any>, options?: GeneralLogOptions) => void;
export declare const warn: (message: string | Record<string, any>, options?: GeneralLogOptions) => void;
export declare const info: (message: string | Record<string, any>, options?: GeneralLogOptions) => void;
export declare const debug: (message: string | Record<string, any>, options?: GeneralLogOptions) => void;
export declare const httpRequest: (method: HttpMethod, url: string, body?: Record<string, any> | null, options?: HttpRequestLogOptions) => string;
export declare const httpResponse: (method: HttpMethod, url: string, statusCode: number, body: (Record<string, any> | null) | undefined, options: HttpResponseLogOptions) => void;
export declare const sftpOperation: (method: SftpMethod, url: string, filePath: string, fileName: string, options: SftpOperationLogOptions) => void;
export default StructuredLogger;
