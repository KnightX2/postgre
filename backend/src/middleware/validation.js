const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation failed', {
            url: req.url,
            method: req.method,
            errors: errors.array(),
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Authentication validation rules
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 1 })
        .withMessage('Password is required')
        .isLength({ max: 128 })
        .withMessage('Password is too long'),
    handleValidationErrors
];

const validateRegister = [
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s\u0600-\u06FF]+$/)
        .withMessage('Name can only contain letters and spaces'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('phoneNum')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('role')
        .isIn(['normal_user', 'admin', 'observer'])
        .withMessage('Invalid role specified'),
    handleValidationErrors
];

// Observer validation rules
const validateObserver = [
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('phoneNum')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('title')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Title is too long'),
    body('availability')
        .optional()
        .isIn(['full-time', 'part-time', 'unavailable'])
        .withMessage('Invalid availability status'),
    handleValidationErrors
];

// Exam validation rules
const validateExam = [
    body('examName')
        .isLength({ min: 2, max: 200 })
        .withMessage('Exam name must be between 2 and 200 characters'),
    body('examDate')
        .isISO8601()
        .withMessage('Please provide a valid date in ISO format'),
    body('startTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Please provide a valid start time (HH:MM format)'),
    body('endTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Please provide a valid end time (HH:MM format)'),
    body('numOfStudents')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Number of students must be between 1 and 10000'),
    handleValidationErrors
];

// Time slot validation rules
const validateTimeSlot = [
    body('day')
        .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
        .withMessage('Invalid day of week'),
    body('startTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Please provide a valid start time (HH:MM format)'),
    body('endTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Please provide a valid end time (HH:MM format)'),
    handleValidationErrors
];

// ID parameter validation
const validateId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer'),
    handleValidationErrors
];

const validateExamId = [
    param('examId')
        .isInt({ min: 1 })
        .withMessage('Exam ID must be a positive integer'),
    handleValidationErrors
];

const validateObserverId = [
    param('observerId')
        .isInt({ min: 1 })
        .withMessage('Observer ID must be a positive integer'),
    handleValidationErrors
];

// Assignment validation
const validateAssignment = [
    body('headId')
        .isInt({ min: 1 })
        .withMessage('Head observer ID must be a positive integer'),
    body('secretaryId')
        .isInt({ min: 1 })
        .withMessage('Secretary observer ID must be a positive integer'),
    body('headId').custom((headId, { req }) => {
        if (headId === req.body.secretaryId) {
            throw new Error('Head and secretary cannot be the same observer');
        }
        return true;
    }),
    handleValidationErrors
];

// Query parameter validation
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

// File upload validation
const validateFileUpload = (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        logger.warn('File upload attempted without files', {
            url: req.url,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        return res.status(400).json({
            success: false,
            message: 'No files uploaded'
        });
    }

    // Additional file validation can be added here
    const file = req.files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        logger.warn('File upload rejected: file too large', {
            filename: file.originalname,
            size: file.size,
            ip: req.ip
        });
        return res.status(400).json({
            success: false,
            message: 'File size exceeds 5MB limit'
        });
    }

    next();
};

module.exports = {
    validateLogin,
    validateRegister,
    validateObserver,
    validateExam,
    validateTimeSlot,
    validateId,
    validateExamId,
    validateObserverId,
    validateAssignment,
    validatePagination,
    validateFileUpload,
    handleValidationErrors
};