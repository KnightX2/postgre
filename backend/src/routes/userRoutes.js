const express = require('express');
const router = express.Router();
const userObserverController = require('../controllers/userObserverController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Observer Routes
router.get('/observers', userObserverController.getObservers); // Get all observers
router.get('/observers/:id', userObserverController.getObserverById); // Get an observer by ID
router.post('/observers', userObserverController.createObserver); // Create a new observer
router.put('/observers/:id', userObserverController.updateObserver); // Update an observer
router.delete('/observers/:id', userObserverController.deleteObserver); // Delete an observer

// Bulk delete observers
router.post('/observers/bulk-delete', userObserverController.bulkDeleteObservers);

// User Routes
router.post('/create', userObserverController.createUser); // Create a new user
router.get('/', userObserverController.getUsers);          // Get all users
router.get('/:id', userObserverController.getUserById);   // Get a user by ID
router.put('/:id', userObserverController.updateUser);    // Update a user
router.delete('/:id', userObserverController.deleteUser); // Delete a user

// Time Slot Routes
router.post('/timeslots', userObserverController.addTimeSlot); // Add a new time slot


// Import your controller functions and middleware
const {
    // ... your other functions
    upload, // The multer instance from the controller
    uploadObservers
} = require('../controllers/userObserverController');

// Observer upload route with proper security
router.post('/observers/upload', 
    authenticateToken, 
    authorizeAdmin,
    userObserverController.upload,
    (req, res, next) => {
        logger.info('File upload processing completed', { 
            userId: req.user?.userId,
            fileCount: req.files?.length || 0 
        });
        next();
    },
    userObserverController.uploadObservers
);

module.exports = router;
