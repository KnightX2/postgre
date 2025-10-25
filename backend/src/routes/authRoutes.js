const express = require('express');
const { registerUser, login, validateToken } = require('../controllers/authController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');
const { validateLogin, validateRegister } = require('../middleware/validation');

const router = express.Router();

// Public Routes (No authentication needed) with validation
router.post('/register', validateRegister, authenticateToken, authorizeAdmin, registerUser );
router.post('/login', validateLogin, login);

// New Validate Token Route
router.get('/validateToken', validateToken);

// Protected Route Example (Requires Authentication)
router.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Access granted to protected route!' });
});

// Admin-Only Route Example (Requires Authentication & Admin Role)
router.get('/admin', authenticateToken, authorizeAdmin, (req, res) => {
    res.json({ message: 'Welcome Admin!' });
});

module.exports = router;