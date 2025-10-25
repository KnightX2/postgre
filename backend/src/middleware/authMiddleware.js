const jwt = require('jsonwebtoken');
require('dotenv').config();
const { client } = require('../../database/db.js');
const logger = require('../utils/logger');

let adminRoleId = null;

const getAdminRoleId = async () => {
    if (adminRoleId) return adminRoleId;
    try {
        const result = await client.query(`SELECT roleid FROM roles WHERE rolename = 'admin'`);
        adminRoleId = result.rows[0]?.roleid;
        return adminRoleId;
    } catch (err) {
        logger.error('Database error fetching admin role', { error: err.message, stack: err.stack });
        throw new Error('Failed to fetch admin role ID');
    }
};

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    logger.debug('Authentication attempt', { ip: req.ip || 'unknown IP' });
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

const authorizeAdmin = async (req, res, next) => {
    const adminRole = await getAdminRoleId();
    logger.debug('Admin authorization check', { userRoleId: req.user.roleId, requiredRoleId: adminRole });
    
    if (req.user.roleId !== adminRole) {
        return res.status(403).json({ 
            message: 'Access denied. Admin only.', 
            userRoleId: req.user.roleId, 
            requiredRoleId: adminRole 
        });
    }
    next();
};

module.exports = { authenticateToken, authorizeAdmin };