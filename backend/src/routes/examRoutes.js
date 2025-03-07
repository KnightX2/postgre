const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');

// Routes (no /api/exams prefix needed - it's already added in index.js)
router.get('/schedules/all', examController.getSchedules);
router.get('/schedules/:scheduleId', examController.getScheduleDetails);
router.post('/upload', 
    authenticateToken,                  // First check if user is authenticated
    upload.single('file'),             // Then handle file upload
    handleUploadError,                 // Handle any upload errors
    examController.uploadExamSchedule   // Finally process the upload
);

// Add the check route before the update route
router.post('/schedules/:scheduleId/check',
    authenticateToken,
    examController.checkScheduleUpdate
);

router.put('/schedules/:scheduleId',
    authenticateToken,
    examController.updateSchedule
);

router.put('/:examId', examController.updateExam);  // Using updateExam instead of editExam
router.delete('/:examId', examController.deleteExam);
router.delete('/schedules/:scheduleId', examController.deleteSchedule);

module.exports = router;

