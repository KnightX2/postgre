const { client } = require('../../database/db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { 
    asyncHandler, 
    createValidationError, 
    createAuthError, 
    createDatabaseError,
    AppError,
    ERROR_CODES 
} = require('../utils/errorHandler');
require('dotenv').config();

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, phoneNum, password, role } = req.body;

    if (!name || !email || !phoneNum || !password) {
        throw createValidationError('All fields are required');
    }
        // Check if email already exists
        const existingUser = await client.query(
            `SELECT * FROM UserInfo WHERE Email = $1`,
            [email]
        );

        // Validate role
        if (!['normal_user', 'admin', 'observer'].includes(role)) {
            throw createValidationError('Invalid role specified');
        }

        if (existingUser.rows.length > 0) {
            throw new AppError('Email already in use', ERROR_CODES.VALIDATION_ERROR, 409);
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into UserInfo table
        const userInfoResult = await client.query(
            `INSERT INTO UserInfo (Name, Email, PhoneNum, Password) 
             VALUES ($1, $2, $3, $4) RETURNING ID`,
            [name, email, phoneNum, hashedPassword]
        );

        const userInfoId = userInfoResult.rows[0].id;

        // Get RoleID from Roles table
        const roleResult = await client.query(
            `SELECT RoleID FROM Roles WHERE RoleName = $1`,
            [role]
        );

        if (roleResult.rows.length === 0) {
            throw createDatabaseError('Role configuration error');
        }

        const roleId = roleResult.rows[0].roleid;

        // Insert into AppUser table with role
        const userResult = await client.query(
            `INSERT INTO AppUser (U_ID, RoleID) 
             VALUES ($1, $2) RETURNING UserID`,
            [userInfoId, roleId]
        );

        res.status(201).json({ 
            success: true,
            message: 'User registered successfully', 
            data: { userId: userResult.rows[0].userid }
        });
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw createValidationError('Email and password are required');
    }
        // Log the login attempt securely
        logger.logAuthAttempt(email, false, 'attempt_started');

        const result = await client.query(
            `SELECT ui.ID, ui.Password, ui.Email, u.UserID, u.RoleID, r.RoleName
            FROM UserInfo ui
            JOIN AppUser u ON ui.ID = u.U_ID
            JOIN Roles r ON u.RoleID = r.RoleID
            WHERE ui.Email = $1`,
            [email]
        );

        logger.logDatabaseOperation('SELECT', 'UserInfo', true);

        if (result.rows.length === 0) {
            logger.logAuthAttempt(email, false, 'user_not_found');
            throw createAuthError('Invalid email or password');
        }

        const user = result.rows[0];

        // User authentication data retrieved successfully

        // Ensure the hashed password exists
        if (!user.password) {
            logger.error('Password not found for user', { userId: user.id });
            throw createDatabaseError('User authentication data corrupted');
        }

        // Password validation initiated

        // Password validation
        try {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                logger.logAuthAttempt(email, false, 'invalid_password');
                throw createAuthError('Invalid email or password');
            }
            
            logger.logAuthAttempt(email, true, 'success');
        } catch (compareError) {
            logger.error('Bcrypt comparison failed', { 
                error: compareError.message, 
                email 
            });
            throw createDatabaseError('Authentication system error');
        }

        // Generate a JWT token
        const token = jwt.sign(
            { userId: user.userid, roleId: user.roleid },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Return the token and user data
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                userId: user.userid,
                roleId: user.roleid,
                isAdmin: user.roleid === 2
            }
        });
});

const validateToken = asyncHandler(async (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        throw createAuthError('No token provided');
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ 
            success: true,
            valid: true, 
            data: { user: decoded }
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw createAuthError('Token expired');
        }
        throw createAuthError('Invalid token');
    }
});

module.exports = { 
    login,
    registerUser,
    validateToken
};

