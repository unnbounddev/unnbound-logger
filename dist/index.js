"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sftpOperation = exports.httpResponse = exports.httpRequest = exports.debug = exports.info = exports.warn = exports.error = exports.log = exports.clearTraceId = exports.getTraceId = exports.generateTimestamp = exports.generateUuid = exports.StructuredLogger = void 0;
/**
 * winston-structured-logger
 *
 * A structured logging library built on top of Winston with TypeScript support.
 * Provides consistent, well-typed logging across different operational contexts.
 */
const logger_1 = require("./logger");
Object.defineProperty(exports, "StructuredLogger", { enumerable: true, get: function () { return logger_1.StructuredLogger; } });
const id_generator_1 = require("./utils/id-generator");
Object.defineProperty(exports, "generateUuid", { enumerable: true, get: function () { return id_generator_1.generateUuid; } });
Object.defineProperty(exports, "generateTimestamp", { enumerable: true, get: function () { return id_generator_1.generateTimestamp; } });
Object.defineProperty(exports, "getTraceId", { enumerable: true, get: function () { return id_generator_1.getTraceId; } });
Object.defineProperty(exports, "clearTraceId", { enumerable: true, get: function () { return id_generator_1.clearTraceId; } });
// Create a default logger instance
const defaultLogger = new logger_1.StructuredLogger();
// Export default logger functions for convenience
exports.log = defaultLogger.log.bind(defaultLogger);
exports.error = defaultLogger.error.bind(defaultLogger);
exports.warn = defaultLogger.warn.bind(defaultLogger);
exports.info = defaultLogger.info.bind(defaultLogger);
exports.debug = defaultLogger.debug.bind(defaultLogger);
exports.httpRequest = defaultLogger.httpRequest.bind(defaultLogger);
exports.httpResponse = defaultLogger.httpResponse.bind(defaultLogger);
exports.sftpOperation = defaultLogger.sftpOperation.bind(defaultLogger);
// Default export is the StructuredLogger class
exports.default = logger_1.StructuredLogger;
