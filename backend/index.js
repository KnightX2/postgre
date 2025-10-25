// index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { client } = require('../backend/database/db.js');
const initDB = require('./database/initDB');
const insertDummyData = require('./database/insertDummyData');

// Import logging infrastructure
const logger = require('./src/utils/logger');
const { createEnhancedLogger } = require('./src/middleware/requestLogger');
const { errorMiddleware } = require('./src/utils/errorHandler');

// Import routes
const userRoutes = require('./src/routes/userRoutes.js');
const timeSlotRouter = require('./src/routes/timeSlotRouter.js');
const authRoutes = require('./src/routes/authRoutes.js');
const examRoutes = require('./src/routes/examRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (order is important)
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false // Allow cross-origin requests
}));

// Rate limiting for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests, please try again later.'
    }
});

app.use('/api/auth', authLimiter);
app.use(generalLimiter);

app.use(cors({
    origin: 'http://localhost:3001', // Allow requests from this origin
    credentials: true, // Allow credentials (e.g., cookies, authorization headers)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));
app.use(express.json({ limit: '10mb' })); // Add size limit
app.use(bodyParser.json({ limit: '10mb' }));

// Use proper Winston logging
app.use(createEnhancedLogger(logger));

// Route prefixes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timeslots', timeSlotRouter);
app.use('/api/exams', examRoutes);
app.use('/api/assignments', assignmentRoutes);

// Log all registered routes
function logRoutes(app) {
    console.log('--- REGISTERED ROUTES ---');
    app._router.stack.forEach(function(r){
        if (r.route && r.route.path){
            console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
        }
    });
    console.log('--- END REGISTERED ROUTES ---');
}

// Call this after setting up routes
logRoutes(app);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connectivity
        const dbCheck = await client.query('SELECT 1 as health_check');
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: dbCheck.rows[0] ? 'connected' : 'disconnected',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        };
        
        logger.info('Health check performed', { 
            status: healthStatus.status,
            database: healthStatus.database,
            memoryUsed: healthStatus.memory.used
        });
        
        res.status(200).json(healthStatus);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        
        const healthStatus = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: 'disconnected',
            error: error.message
        };
        
        res.status(503).json(healthStatus);
    }
});

// Basic route
app.get('/', (req, res) => {
    res.send('Exam Observer API is running!');
});

// Use standardized error handling middleware
app.use(errorMiddleware);

// Initialize database and insert dummy data
async function initializeDatabase() {
    try {
        // Check if tables exist
        const tablesCheckQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `;
        const tablesResult = await client.query(tablesCheckQuery);

        // If no tables exist, create them
        if (tablesResult.rows.length === 0) {
            logger.info('No tables found. Initializing database...');
            await initDB();
            logger.info('Database tables created successfully');
        }

        // Check if tables are empty
        const emptyTablesCheck = `
            SELECT schemaname, relname 
            FROM pg_stat_user_tables 
            WHERE n_live_tup = 0;
        `;
        const emptyTablesResult = await client.query(emptyTablesCheck);

        // If tables are empty, insert dummy data
        if (emptyTablesResult.rows.length > 0) {
            logger.info('Some tables are empty. Inserting dummy data...');
            await insertDummyData();
            logger.info('Dummy data inserted successfully');
        }
    } catch (err) {
        logger.error('Error during database initialization', { error: err.message, stack: err.stack });
        process.exit(1);
    }
}

// Start server
const server = app.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT}`);
    
    // Initialize database before fully starting the server
    try {
        await initializeDatabase();
        logger.info('Application started successfully');
    } catch (err) {
        logger.error('Failed to initialize database', { error: err.message, stack: err.stack });
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
        client.end();
        logger.info('Server and database connections closed');
        process.exit(0);
    });
});

app.options('*', cors()); // Handle preflight requests for all routes
