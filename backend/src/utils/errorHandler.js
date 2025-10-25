const logger = require('./logger');

/**
 * Centralized error handling utilities
 * Provides consistent error responses and logging across the application
 */

// Standard error codes
const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
    BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// Error severity levels
const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = 500, severity = ERROR_SEVERITY.MEDIUM, metadata = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.severity = severity;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
        
        // Capture stack trace
        Error.captureStackTrace(this, AppError);
    }
}

/**
 * Handles errors consistently across the application
 * @param {Error} error - The error to handle
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {string} context - Context where error occurred (e.g., 'user_registration')
 */
function handleError(error, req, res, context = 'unknown') {
    // Default values
    let statusCode = 500;
    let code = ERROR_CODES.INTERNAL_ERROR;
    let severity = ERROR_SEVERITY.MEDIUM;
    let message = 'An unexpected error occurred';
    let metadata = {};

    // Handle AppError instances
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        code = error.code;
        severity = error.severity;
        message = error.message;
        metadata = error.metadata;
    } 
    // Handle known error types
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        code = ERROR_CODES.VALIDATION_ERROR;
        severity = ERROR_SEVERITY.LOW;
        message = 'Validation failed';
    }
    else if (error.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        code = ERROR_CODES.DATABASE_ERROR;
        severity = ERROR_SEVERITY.LOW;
        message = 'Resource already exists';
    }
    else if (error.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        code = ERROR_CODES.DATABASE_ERROR;
        severity = ERROR_SEVERITY.LOW;
        message = 'Referenced resource does not exist';
    }
    else if (error.code === 'ECONNREFUSED') {
        statusCode = 503;
        code = ERROR_CODES.DATABASE_ERROR;
        severity = ERROR_SEVERITY.HIGH;
        message = 'Database connection failed';
    }

    // Log the error with appropriate level
    const logLevel = severity === ERROR_SEVERITY.CRITICAL ? 'error' : 
                    severity === ERROR_SEVERITY.HIGH ? 'error' :
                    severity === ERROR_SEVERITY.MEDIUM ? 'warn' : 'info';

    logger.log(logLevel, 'Application error handled', {
        context,
        code,
        message: error.message,
        statusCode,
        severity,
        stack: error.stack,
        url: req?.url,
        method: req?.method,
        ip: req?.ip,
        userAgent: req?.get('user-agent'),
        userId: req?.user?.userId,
        metadata: {
            ...metadata,
            originalErrorName: error.name,
            originalErrorCode: error.code
        }
    });

    // Prepare response
    const response = {
        success: false,
        error: {
            code,
            message,
            timestamp: new Date().toISOString()
        }
    };

    // Add additional details in development
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = error.stack;
        response.error.originalMessage = error.message;
    }

    // Security: Never expose internal details in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        response.error.message = 'Internal server error';
    }

    res.status(statusCode).json(response);
}

/**
 * Async error wrapper for route handlers
 * Automatically catches errors and passes them to error handling middleware
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Validation error helper
 */
function createValidationError(message, field = null) {
    return new AppError(
        message,
        ERROR_CODES.VALIDATION_ERROR,
        400,
        ERROR_SEVERITY.LOW,
        { field }
    );
}

/**
 * Authentication error helper
 */
function createAuthError(message = 'Authentication required') {
    return new AppError(
        message,
        ERROR_CODES.AUTHENTICATION_ERROR,
        401,
        ERROR_SEVERITY.MEDIUM
    );
}

/**
 * Authorization error helper
 */
function createAuthorizationError(message = 'Insufficient permissions') {
    return new AppError(
        message,
        ERROR_CODES.AUTHORIZATION_ERROR,
        403,
        ERROR_SEVERITY.MEDIUM
    );
}

/**
 * Not found error helper
 */
function createNotFoundError(resource = 'Resource') {
    return new AppError(
        `${resource} not found`,
        ERROR_CODES.NOT_FOUND,
        404,
        ERROR_SEVERITY.LOW
    );
}

/**
 * Database error helper
 */
function createDatabaseError(message = 'Database operation failed', originalError = null) {
    return new AppError(
        message,
        ERROR_CODES.DATABASE_ERROR,
        500,
        ERROR_SEVERITY.HIGH,
        { originalError: originalError?.message }
    );
}

/**
 * Business logic error helper
 */
function createBusinessError(message, metadata = {}) {
    return new AppError(
        message,
        ERROR_CODES.BUSINESS_LOGIC_ERROR,
        400,
        ERROR_SEVERITY.MEDIUM,
        metadata
    );
}

/**
 * Express error handling middleware
 * Use this as the last middleware in your app
 */
function errorMiddleware(error, req, res, next) {
    handleError(error, req, res, 'middleware');
}

module.exports = {
    ERROR_CODES,
    ERROR_SEVERITY,
    AppError,
    handleError,
    asyncHandler,
    createValidationError,
    createAuthError,
    createAuthorizationError,
    createNotFoundError,
    createDatabaseError,
    createBusinessError,
    errorMiddleware
};