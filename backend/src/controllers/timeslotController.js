// controllers/TimeSlotController.js
const { client } = require('../../database/db');
const { 
  parseTimeToMinutes,
  formatTimeForDisplay 
} = require('../utils/dateTimeUtils');
const logger = require('../utils/logger');
const { 
    asyncHandler, 
    createValidationError, 
    createNotFoundError, 
    createDatabaseError,
    createBusinessError 
} = require('../utils/errorHandler');

const addTimeSlot = asyncHandler(async (req, res) => {
    const { startTime, endTime, day, observerID } = req.body;

    // Log input data securely
    logger.debug('Time slot creation request', {
        day,
        observerID,
        hasStartTime: !!startTime,
        hasEndTime: !!endTime,
        userId: req.user?.userId
    });

    // Validate required fields
    if (!startTime) {
        throw createValidationError('Start time is required', 'startTime');
    }

    if (!endTime) {
        throw createValidationError('End time is required', 'endTime');
    }

    if (!day) {
        throw createValidationError('Day is required', 'day');
    }

    if (!observerID) {
        throw createValidationError('Observer ID is required', 'observerID');
    }
    // Check if the observer exists and get their availability
    const observerResult = await client.query(
        `SELECT availability FROM Observer WHERE ObserverID = $1`,
        [observerID]
    );

    if (observerResult.rows.length === 0) {
        throw createNotFoundError('Observer');
    }

    // Check if observer is full-time
    if (observerResult.rows[0].availability === 'full-time') {
        throw createBusinessError('Cannot add time slots for full-time observers');
    }

        // Validate and potentially adjust times for cross-midnight slots using bulletproof utilities
        let adjustedStartTime = formatTimeForDisplay(startTime, false);
        let adjustedEndTime = formatTimeForDisplay(endTime, false);
        let adjustedDay = day;

        // If end time is earlier than start time, assume it crosses midnight
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(endTime);

    if (endMinutes < startMinutes) {
        logger.info('Cross-midnight time slot detected', { 
            day, 
            startTime, 
            endTime, 
            observerID 
        });
        
        // Adjust day for the end time
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayIndex = days.indexOf(day.toLowerCase());
        const nextDayIndex = (currentDayIndex + 1) % 7;
        
        logger.debug('Cross-midnight adjustment', {
            originalDay: day,
            nextDay: days[nextDayIndex]
        });
    }

        // Check for existing time slots for the same observer on the same day and overlapping times
        const existingTimeSlot = await client.query(
            `SELECT * FROM TimeSlot 
             WHERE ObserverID = $1 AND day = $2 
             AND (
                 (StartTime < $3 AND EndTime > $3) OR 
                 (StartTime < $4 AND EndTime > $4) OR
                 (StartTime >= $3 AND EndTime <= $4)
             )`,
            [observerID, adjustedDay, adjustedStartTime, adjustedEndTime]
        );

    if (existingTimeSlot.rows.length > 0) {
        throw createBusinessError('A time slot already exists for this observer on this day with overlapping times', {
            observerID,
            day: adjustedDay,
            conflictingSlots: existingTimeSlot.rows.length
        });
    }

    // Insert time slot into the database
    const result = await client.query(
        `INSERT INTO TimeSlot (StartTime, EndTime, day, ObserverID)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [adjustedStartTime, adjustedEndTime, adjustedDay, observerID]
    );

    // Log successful insertion
    logger.info('Time slot created successfully', {
        timeSlotId: result.rows[0].timeslotid,
        observerID,
        day: adjustedDay,
        userId: req.user?.userId
    });

    // Return the newly created time slot
    res.status(201).json({
        success: true,
        message: 'Time slot created successfully',
        data: result.rows[0]
    });
});

const updateTimeSlot = asyncHandler(async (req, res) => {
    const timeSlotID = parseInt(req.params.timeSlotID);
    
    if (isNaN(timeSlotID)) {
        throw createValidationError('Invalid TimeSlotID format', 'timeSlotID');
    }

    const { startTime, endTime, day, observerID } = req.body;

    // Validate required fields
    if (!startTime) {
        throw createValidationError('Start time is required', 'startTime');
    }

    if (!endTime) {
        throw createValidationError('End time is required', 'endTime');
    }

    if (!day) {
        throw createValidationError('Day is required', 'day');
    }

    if (!observerID) {
        throw createValidationError('Observer ID is required', 'observerID');
    }
    // Check if the time slot exists
    const timeSlotExists = await client.query(
        `SELECT * FROM TimeSlot WHERE TimeSlotID = $1`,
        [timeSlotID]
    );

    if (timeSlotExists.rows.length === 0) {
        throw createNotFoundError('Time slot');
    }

    // Check if the observer exists
    const observerExists = await client.query(
        `SELECT * FROM Observer WHERE ObserverID = $1`,
        [observerID]
    );

    if (observerExists.rows.length === 0) {
        throw createNotFoundError('Observer');
    }

    // Check observer's availability
    const observerResult = await client.query(
        `SELECT availability FROM Observer WHERE ObserverID = $1`,
        [observerID]
    );

    if (observerResult.rows[0].availability === 'full-time') {
        throw createBusinessError('Cannot update time slots for full-time observers');
    }

    // Update the time slot in the database
    const result = await client.query(
        `UPDATE TimeSlot 
         SET StartTime = $1, EndTime = $2, day = $3, ObserverID = $4
         WHERE TimeSlotID = $5 RETURNING *`,
        [startTime, endTime, day, observerID, timeSlotID]
    );

    logger.info('Time slot updated successfully', {
        timeSlotId: timeSlotID,
        observerID,
        day,
        userId: req.user?.userId
    });

    // Return the updated time slot
    res.status(200).json({
        success: true,
        message: 'Time slot updated successfully',
        data: result.rows[0]
    });
});

const deleteTimeSlot = asyncHandler(async (req, res) => {
    const { timeSlotID } = req.params;

    // Check if the time slot exists
    const timeSlotExists = await client.query(
        `SELECT * FROM TimeSlot WHERE TimeSlotID = $1`,
        [timeSlotID]
    );

    if (timeSlotExists.rows.length === 0) {
        throw createNotFoundError('Time slot');
    }

    // Delete the time slot from the database
    await client.query(
        `DELETE FROM TimeSlot WHERE TimeSlotID = $1`,
        [timeSlotID]
    );

    logger.info('Time slot deleted successfully', {
        timeSlotId: timeSlotID,
        userId: req.user?.userId
    });

    // Return a success message
    res.status(200).json({
        success: true,
        message: 'Time slot deleted successfully'
    });
});

module.exports = { addTimeSlot, deleteTimeSlot, updateTimeSlot };
