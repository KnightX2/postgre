const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const AlgorithmComparison = require('../utils/compareAlgorithms');
const logger = require('../utils/logger');

// All routes should be protected
router.use(authenticateToken);

// Assignment routes
router.get('/exams', assignmentController.getAllExams);
router.get('/exams/:examId/assignments', assignmentController.getExamAssignments);
router.get('/observers/:observerId/assignments', assignmentController.getObserverAssignments);
router.post('/exams/:examId/assign', assignmentController.assignObservers);
router.post('/exams/:examId/observers/:observerId/unavailable', assignmentController.handleObserverUnavailability);
router.get('/exams/:examId/available-observers', assignmentController.getAvailableObservers);
router.get('/statistics', assignmentController.getAssignmentStats);
router.get('/performance/history', assignmentController.getPerformanceHistory);
router.get('/performance/stats', assignmentController.getPerformanceStats);

// Genetic algorithm assignment
router.post('/schedules/:scheduleId/assign-genetic', assignmentController.assignObserversWithGA);

// Linear programming assignment (now JavaScript implementation)
router.post('/schedules/:scheduleId/assign-lp', assignmentController.assignObserversWithLP);


// Run and compare algorithms
router.post('/schedules/:scheduleId/compare-algorithms', assignmentController.runAndCompareAlgorithms);

// Handle unavailability with file upload support
router.post(
    '/exams/:examId/observers/:observerId/unavailable',
    upload.single('documentation'), // Optional file upload for documentation
    handleUploadError,
    assignmentController.handleObserverUnavailability
);

// Algorithm comparison routes
router.get('/algorithms/compare', async (req, res) => {
    try {
        logger.info('Algorithm comparison requested', { userId: req.user?.userId });
        
        const comparison = await AlgorithmComparison.compareLatestReports();
        
        if (!comparison) {
            logger.warn('No comparison data available', { userId: req.user?.userId });
            return res.status(404).json({
                success: false,
                message: 'No algorithm reports found. Please run at least one algorithm first.'
            });
        }
        
        // Log the structure of the comparison data
        logger.debug('Comparison data structure', { 
            keys: Object.keys(comparison),
            userId: req.user?.userId 
        });
        
        res.json({
            success: true,
            comparison: comparison
        });
    } catch (error) {
        logger.error('Error comparing algorithms', { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.userId 
        });
        
        // Send a more descriptive error message
        res.status(500).json({
            success: false,
            message: 'Error comparing algorithms',
            error: error.message,
            details: 'An error occurred while comparing algorithm results. This might happen if the metrics data is incomplete or malformed.'
        });
    }
});

router.get('/algorithms/trends', async (req, res) => {
    try {
        const trends = await AlgorithmComparison.analyzeSummaryTrends();
        res.json({
            success: true,
            trends: trends
        });
    } catch (error) {
        logger.error('Error analyzing trends', { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.userId 
        });
        res.status(500).json({
            success: false,
            message: 'Error analyzing trends',
            error: error.message
        });
    }
});

module.exports = router; 