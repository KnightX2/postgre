const logger = require('./logger');

/**
 * Safe SQL utilities to prevent injection attacks
 */

/**
 * Builds a safe CASE statement for bulk updates using parameterized queries
 * @param {Array} updates - Array of {examId, headId, secretaryId} objects
 * @param {Object} client - Database client for query execution
 * @returns {Object} - Query string and parameters for safe execution
 */
function buildSafeBulkUpdateQuery(updates) {
    if (!updates || updates.length === 0) {
        return null;
    }

    // Validate that all values are STRICTLY integers to prevent injection
    const validatedUpdates = updates.map(update => {
        // First check if the values are already numbers and integers
        let examId = update.examId;
        let headId = update.headId;
        let secretaryId = update.secretaryId;

        // Reject any non-numeric types or strings that contain non-numeric characters
        if (typeof examId === 'string') {
            if (!/^\d+$/.test(examId)) {
                logger.logSecurityEvent('SQL injection attempt detected', { 
                    field: 'examId', 
                    value: examId,
                    type: typeof examId 
                });
                throw new Error('Invalid examId format - only positive integers allowed');
            }
            examId = parseInt(examId, 10);
        }

        if (typeof headId === 'string') {
            if (!/^\d+$/.test(headId)) {
                logger.logSecurityEvent('SQL injection attempt detected', { 
                    field: 'headId', 
                    value: headId,
                    type: typeof headId 
                });
                throw new Error('Invalid headId format - only positive integers allowed');
            }
            headId = parseInt(headId, 10);
        }

        if (typeof secretaryId === 'string') {
            if (!/^\d+$/.test(secretaryId)) {
                logger.logSecurityEvent('SQL injection attempt detected', { 
                    field: 'secretaryId', 
                    value: secretaryId,
                    type: typeof secretaryId 
                });
                throw new Error('Invalid secretaryId format - only positive integers allowed');
            }
            secretaryId = parseInt(secretaryId, 10);
        }

        // Final validation
        if (!Number.isInteger(examId) || !Number.isInteger(headId) || !Number.isInteger(secretaryId)) {
            logger.error('Invalid data types after conversion in bulk update', { 
                examId: update.examId, 
                headId: update.headId, 
                secretaryId: update.secretaryId 
            });
            throw new Error('All IDs must be valid integers');
        }

        if (examId <= 0 || headId <= 0 || secretaryId <= 0) {
            logger.error('Invalid ID values in bulk update', { examId, headId, secretaryId });
            throw new Error('All IDs must be positive integers');
        }

        return { examId, headId, secretaryId };
    });

    // Build parameterized query using PostgreSQL unnest() function for safety
    const examIds = validatedUpdates.map(u => u.examId);
    const headIds = validatedUpdates.map(u => u.headId);
    const secretaryIds = validatedUpdates.map(u => u.secretaryId);

    const query = `
        UPDATE ExamSchedule 
        SET 
            Status = 'assigned',
            ExamHead = data_table.head_id,
            ExamSecretary = data_table.secretary_id
        FROM (
            SELECT 
                unnest($1::int[]) as exam_id,
                unnest($2::int[]) as head_id,
                unnest($3::int[]) as secretary_id
        ) as data_table
        WHERE ExamSchedule.ExamID = data_table.exam_id
    `;

    return {
        query,
        params: [examIds, headIds, secretaryIds]
    };
}

/**
 * Safely builds IN clause with parameterized queries
 * @param {Array} values - Array of values for IN clause
 * @param {number} startIndex - Starting parameter index (e.g., if $1 is used, start with 2)
 * @returns {Object} - SQL fragment and parameters
 */
function buildSafeInClause(values, startIndex = 1) {
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Values must be a non-empty array');
    }

    // Validate all values are STRICTLY integers
    const validatedValues = values.map(value => {
        // Reject any non-numeric strings
        if (typeof value === 'string') {
            if (!/^\d+$/.test(value)) {
                logger.logSecurityEvent('SQL injection attempt in IN clause', { value });
                throw new Error('Invalid value format in IN clause - only positive integers allowed');
            }
            value = parseInt(value, 10);
        }

        if (!Number.isInteger(value) || value <= 0) {
            logger.error('Invalid value in IN clause', { value });
            throw new Error('All values in IN clause must be positive integers');
        }
        return value;
    });

    const placeholders = validatedValues.map((_, index) => `$${startIndex + index}`).join(', ');
    return {
        clause: `IN (${placeholders})`,
        params: validatedValues
    };
}

/**
 * Sanitizes table and column names (for cases where they can't be parameterized)
 * @param {string} identifier - Database identifier to sanitize
 * @returns {string} - Sanitized identifier
 */
function sanitizeIdentifier(identifier) {
    if (typeof identifier !== 'string') {
        throw new Error('Identifier must be a string');
    }

    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
        logger.logSecurityEvent('Invalid database identifier attempted', { identifier });
        throw new Error('Invalid database identifier');
    }

    return identifier;
}

/**
 * Validates and sanitizes ORDER BY clauses
 * @param {string} orderBy - ORDER BY clause
 * @param {Array} allowedColumns - Whitelist of allowed column names
 * @returns {string} - Sanitized ORDER BY clause
 */
function sanitizeOrderBy(orderBy, allowedColumns = []) {
    if (!orderBy || typeof orderBy !== 'string') {
        return '';
    }

    const parts = orderBy.trim().split(/\s+/);
    const column = parts[0];
    const direction = parts[1]?.toUpperCase();

    // Validate column name
    if (!allowedColumns.includes(column)) {
        logger.logSecurityEvent('Invalid ORDER BY column attempted', { column, allowed: allowedColumns });
        throw new Error('Invalid ORDER BY column');
    }

    // Validate direction
    if (direction && !['ASC', 'DESC'].includes(direction)) {
        logger.logSecurityEvent('Invalid ORDER BY direction attempted', { direction });
        throw new Error('Invalid ORDER BY direction');
    }

    return `${sanitizeIdentifier(column)}${direction ? ` ${direction}` : ''}`;
}

/**
 * Logs SQL operations for security auditing
 * @param {string} operation - Type of SQL operation
 * @param {string} table - Table being operated on
 * @param {number} affectedRows - Number of rows affected
 * @param {Object} metadata - Additional metadata
 */
function logSqlOperation(operation, table, affectedRows = 0, metadata = {}) {
    logger.logDatabaseOperation(operation, table, true);
    
    if (process.env.NODE_ENV === 'development') {
        logger.debug('SQL operation details', {
            operation,
            table,
            affectedRows,
            ...metadata
        });
    }
}

module.exports = {
    buildSafeBulkUpdateQuery,
    buildSafeInClause,
    sanitizeIdentifier,
    sanitizeOrderBy,
    logSqlOperation
};