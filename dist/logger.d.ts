import { LogLevel, LoggerOptions, GeneralLogOptions, HttpRequestLogOptions, HttpResponseLogOptions, SftpOperationLogOptions, HttpMethod, SftpMethod } from './types';
/**
 * StructuredLogger provides typed, structured logging with Winston
 */
export declare class StructuredLogger {
    private logger;
    private defaultLevel;
    private serviceName?;
    private environment?;
    /**
     * Creates a new StructuredLogger instance
     * @param options - Configuration options for the logger
     */
    constructor(options?: LoggerOptions);
    /**
     * Creates the log format based on the specified format type
     * @param formatType - The format type ('json', 'simple', or 'pretty')
     * @returns Winston format
     */
    private getLogFormat;
    /**
     * Logs a general message
     * @param level - Log level
     * @param message - Log message
     * @param options - Additional logging options
     */
    log(level: LogLevel, message: string | Record<string, any>, options?: GeneralLogOptions): void;
    /**
     * Logs an error message
     * @param message - Error message or object
     * @param options - Additional logging options
     */
    error(message: string | Error | Record<string, any>, options?: GeneralLogOptions): void;
    /**
     * Logs a warning message
     * @param message - Warning message
     * @param options - Additional logging options
     */
    warn(message: string | Record<string, any>, options?: GeneralLogOptions): void;
    /**
     * Logs an info message
     * @param message - Info message
     * @param options - Additional logging options
     */
    info(message: string | Record<string, any>, options?: GeneralLogOptions): void;
    /**
     * Logs a debug message
     * @param message - Debug message
     * @param options - Additional logging options
     */
    debug(message: string | Record<string, any>, options?: GeneralLogOptions): void;
    /**
     * Logs an HTTP request
     * @param method - HTTP method
     * @param url - Request URL
     * @param body - Optional request body
     * @param options - Additional logging options
     * @returns The request ID for correlating with the response
     */
    httpRequest(method: HttpMethod, url: string, body?: Record<string, any> | null, options?: HttpRequestLogOptions): string;
    /**
     * Logs an HTTP response
     * @param method - HTTP method
     * @param url - Request URL
     * @param statusCode - HTTP status code
     * @param body - Optional response body
     * @param options - Additional logging options
     */
    httpResponse(method: HttpMethod, url: string, statusCode: number, body: (Record<string, any> | null) | undefined, options: HttpResponseLogOptions): void;
    /**
     * Logs an SFTP operation
     * @param method - SFTP method
     * @param url - SFTP server URL
     * @param filePath - Path to the file on the SFTP server
     * @param fileName - Name of the file
     * @param options - Additional logging options
     */
    sftpOperation(method: SftpMethod, url: string, filePath: string, fileName: string, options: SftpOperationLogOptions): void;
}
