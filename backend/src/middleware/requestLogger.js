// Request logging middleware using Winston
// This replaces the basic console.log statements in index.js

const requestLogger = (req, res, next) => {
    // For now, use console.log until Winston is installed
    // This will be updated to use the proper logger once Winston is available
    
    const startTime = Date.now();
    
    // Log request start
    const logData = {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
    };
    
    // In development, log more details
    if (process.env.NODE_ENV === 'development') {
        logData.contentType = req.get('content-type');
    }
    
    console.log('Request:', JSON.stringify(logData));
    
    // Log response completion
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log('Response:', JSON.stringify({
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        }));
    });
    
    next();
};

// Enhanced version for when Winston is available
const createEnhancedLogger = (logger) => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Log request
        logger.logRequest(req, 'Incoming request');
        
        // Log response completion
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const level = res.statusCode >= 400 ? 'warn' : 'info';
            
            logger.log(level, 'Request completed', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
                userId: req.user?.userId
            });
        });
        
        next();
    };
};

module.exports = {
    requestLogger,
    createEnhancedLogger
};