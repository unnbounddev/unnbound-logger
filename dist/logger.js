"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredLogger = void 0;
/**
 * Core logger implementation built on Winston
 */
const winston_1 = require("winston");
const id_generator_1 = require("./utils/id-generator");
/**
 * StructuredLogger provides typed, structured logging with Winston
 */
class StructuredLogger {
    /**
     * Creates a new StructuredLogger instance
     * @param options - Configuration options for the logger
     */
    constructor(options = {}) {
        this.defaultLevel = options.defaultLevel || 'info';
        this.serviceName = options.serviceName;
        this.environment = options.environment;
        if (options.winstonLogger) {
            this.logger = options.winstonLogger;
        }
        else {
            const logFormat = this.getLogFormat(options.format || 'json');
            this.logger = (0, winston_1.createLogger)({
                level: this.defaultLevel,
                format: logFormat,
                defaultMeta: {
                    ...(this.serviceName && { service: this.serviceName }),
                    ...(this.environment && { environment: this.environment })
                },
                transports: options.transports || [new winston_1.transports.Console()]
            });
        }
    }
    /**
     * Creates the log format based on the specified format type
     * @param formatType - The format type ('json', 'simple', or 'pretty')
     * @returns Winston format
     */
    getLogFormat(formatType) {
        switch (formatType) {
            case 'simple':
                return winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.simple());
            case 'pretty':
                return winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.prettyPrint());
            case 'json':
            default:
                return winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json());
        }
    }
    /**
     * Logs a general message
     * @param level - Log level
     * @param message - Log message
     * @param options - Additional logging options
     */
    log(level, message, options = {}) {
        const workflowId = options.workflowId || (0, id_generator_1.generateUuid)();
        const traceId = options.traceId || (0, id_generator_1.getTraceId)(workflowId);
        const logEntry = {
            logId: (0, id_generator_1.generateUuid)(),
            timestamp: (0, id_generator_1.generateTimestamp)(),
            traceId,
            workflowId,
            logLevel: level,
            logType: 'general',
            message,
            method: null,
            url: null,
            requestId: null,
            responseStatusCode: null,
            filePath: null,
            fileName: null,
            fileSize: null,
            duration: null
        };
        this.logger.log(level, '', { ...logEntry });
    }
    /**
     * Logs an error message
     * @param message - Error message or object
     * @param options - Additional logging options
     */
    error(message, options = {}) {
        let logMessage;
        if (message instanceof Error) {
            logMessage = {
                message: message.message,
                stack: message.stack,
                name: message.name
            };
        }
        else {
            logMessage = message;
        }
        this.log('error', logMessage, options);
    }
    /**
     * Logs a warning message
     * @param message - Warning message
     * @param options - Additional logging options
     */
    warn(message, options = {}) {
        this.log('warn', message, options);
    }
    /**
     * Logs an info message
     * @param message - Info message
     * @param options - Additional logging options
     */
    info(message, options = {}) {
        this.log('info', message, options);
    }
    /**
     * Logs a debug message
     * @param message - Debug message
     * @param options - Additional logging options
     */
    debug(message, options = {}) {
        this.log('debug', message, options);
    }
    /**
     * Logs an HTTP request
     * @param method - HTTP method
     * @param url - Request URL
     * @param body - Optional request body
     * @param options - Additional logging options
     * @returns The request ID for correlating with the response
     */
    httpRequest(method, url, body = null, options = {}) {
        const workflowId = options.workflowId || (0, id_generator_1.generateUuid)();
        const traceId = options.traceId || (0, id_generator_1.getTraceId)(workflowId);
        const requestId = options.requestId || (0, id_generator_1.generateUuid)();
        const logEntry = {
            logId: (0, id_generator_1.generateUuid)(),
            timestamp: (0, id_generator_1.generateTimestamp)(),
            requestId,
            traceId,
            workflowId,
            logLevel: options.level || this.defaultLevel,
            logType: 'httpRequest',
            method,
            url,
            message: body,
            responseStatusCode: null,
            filePath: null,
            fileName: null,
            fileSize: null,
            duration: null
        };
        this.logger.log(options.level || this.defaultLevel, '', { ...logEntry });
        return requestId;
    }
    /**
     * Logs an HTTP response
     * @param method - HTTP method
     * @param url - Request URL
     * @param statusCode - HTTP status code
     * @param body - Optional response body
     * @param options - Additional logging options
     */
    httpResponse(method, url, statusCode, body = null, options) {
        const workflowId = options.workflowId || (0, id_generator_1.generateUuid)();
        const traceId = options.traceId || (0, id_generator_1.getTraceId)(workflowId);
        const requestId = options.requestId || (0, id_generator_1.generateUuid)();
        // Determine log level based on status code
        let level = options.level || this.defaultLevel;
        if (!options.level) {
            if (statusCode >= 500) {
                level = 'error';
            }
            else if (statusCode >= 400) {
                level = 'warn';
            }
            else {
                level = 'info';
            }
        }
        const logEntry = {
            logId: (0, id_generator_1.generateUuid)(),
            timestamp: (0, id_generator_1.generateTimestamp)(),
            requestId,
            traceId,
            workflowId,
            logLevel: level,
            logType: 'httpResponse',
            method,
            url,
            responseStatusCode: statusCode,
            message: body,
            duration: options.duration,
            filePath: null,
            fileName: null,
            fileSize: null
        };
        this.logger.log(level, '', { ...logEntry });
    }
    /**
     * Logs an SFTP operation
     * @param method - SFTP method
     * @param url - SFTP server URL
     * @param filePath - Path to the file on the SFTP server
     * @param fileName - Name of the file
     * @param options - Additional logging options
     */
    sftpOperation(method, url, filePath, fileName, options) {
        const workflowId = options.workflowId || (0, id_generator_1.generateUuid)();
        const traceId = options.traceId || (0, id_generator_1.getTraceId)(workflowId);
        const logEntry = {
            logId: (0, id_generator_1.generateUuid)(),
            timestamp: (0, id_generator_1.generateTimestamp)(),
            requestId: null,
            traceId,
            workflowId,
            logLevel: options.level || this.defaultLevel,
            logType: 'sftpOperation',
            method,
            url,
            responseStatusCode: null,
            message: null,
            filePath,
            fileName,
            fileSize: options.fileSize || null,
            duration: options.duration
        };
        this.logger.log(options.level || this.defaultLevel, '', { ...logEntry });
    }
}
exports.StructuredLogger = StructuredLogger;
