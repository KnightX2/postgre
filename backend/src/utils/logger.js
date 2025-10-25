const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels and colors
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(logColors);

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    levels: logLevels,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss:ms'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'exam-observer-api'
    },
    transports: [
        // Write errors to error.log
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs to combined.log
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.simple(),
            winston.format.printf(
                (info) => `${info.timestamp} ${info.level}: ${info.message}`
            )
        )
    }));
}

// Create a stream object for HTTP request logging (for Morgan)
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

// Helper methods for common logging patterns
logger.logRequest = (req, message = 'Request received') => {
    logger.http(message, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.userId
    });
};

logger.logAuthAttempt = (email, success, reason = null) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'Authentication attempt', {
        email,
        success,
        reason,
        timestamp: new Date().toISOString()
    });
};

logger.logDatabaseOperation = (operation, table, success, error = null) => {
    const level = success ? 'debug' : 'error';
    logger.log(level, 'Database operation', {
        operation,
        table,
        success,
        error: error?.message
    });
};

logger.logSecurityEvent = (event, details = {}) => {
    logger.warn('Security event', {
        event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

module.exports = logger;