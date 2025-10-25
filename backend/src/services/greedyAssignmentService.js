const { client } = require('../../database/db');
const fs = require('fs').promises;
const path = require('path');
const AssignmentQualityMetrics = require('../utils/assignmentQualityMetrics');
const { buildSafeBulkUpdateQuery, logSqlOperation } = require('../utils/sqlUtils');
const logger = require('../utils/logger');
const { 
  parseTimeToMinutes, 
  getDayName, 
  examFitsInTimeslot,
  examsOverlap 
} = require('../utils/dateTimeUtils');
const ObserverUtils = require('../utils/observerUtils');

class GreedyAssignmentService {
  constructor() {
    this.startTime = Date.now();
    this.logMessages = [];
    this.currentExamData = [];
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = data ? `[${timestamp}] ${message}` : `[${timestamp}] ${message}`;
    this.logMessages.push(logEntry);
    
    if (data) {
      logger.debug(message, data);
    } else {
      logger.debug(message);
    }
  }

  async saveLogs() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `greedy-algorithm-${timestamp}.log`;
    const logDir = path.join(__dirname, '../../logs');
    
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const logPath = path.join(logDir, filename);
    const logContent = this.logMessages.join('\n');
    
    await fs.writeFile(logPath, logContent);
    logger.info('Greedy algorithm log file saved', { filename });
    
    return logPath;
  }

  // Main greedy assignment method
  async assignObserversWithGreedy(examIds) {
    const algorithmStartTime = Date.now();
    
    try {
      this.log(`[GREEDY] Starting greedy algorithm for ${examIds.length} exams`);
      
      // Load data
      const data = await this.loadData(examIds);
      this.log(`[GREEDY] Loaded data: ${data.exams.length} exams, ${data.observers.length} observers`);
      
      // Run greedy algorithm
      const results = await this.runPureGreedyAlgorithm(data, examIds, algorithmStartTime);
      
      // Save logs
      await this.saveLogs();
      
      return results;
      
    } catch (error) {
      this.log(`[GREEDY] Error: ${error.message}`);
      logger.error('Greedy algorithm error', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  // Load exam and observer data
  async loadData(examIds) {
    try {
      // Get exam details
      const examsResult = await client.query(`
        SELECT 
          es.*,
          c.CourseName,
          r.RoomNum
        FROM ExamSchedule es
        JOIN Course c ON es.CourseID = c.CourseID
        JOIN Room r ON es.RoomID = r.RoomID
        WHERE es.ExamID = ANY($1)
        ORDER BY es.ExamDate, es.StartTime
      `, [examIds]);

      // Get all observers with their availability and current workload
      const observersResult = await client.query(`
        WITH observer_workload AS (
          SELECT 
            ObserverID,
            COUNT(*) as assignment_count
          FROM ExamAssignment 
          WHERE Status = 'active'
          GROUP BY ObserverID
        ),
        observer_time_slots AS (
          SELECT 
            ObserverID,
            array_agg(
              json_build_object(
                'day', day,
                'startTime', StartTime,
                'endTime', EndTime
              )
            ) as time_slots
          FROM TimeSlot
          GROUP BY ObserverID
        )
        SELECT 
          o.*,
          COALESCE(ow.assignment_count, 0) as current_workload,
          ots.time_slots
        FROM Observer o
        LEFT JOIN observer_workload ow ON o.ObserverID = ow.ObserverID
        LEFT JOIN observer_time_slots ots ON o.ObserverID = ots.ObserverID
        ORDER BY 
          CASE WHEN o.Title ILIKE '%dr%' THEN 0 ELSE 1 END,
          COALESCE(ow.assignment_count, 0),
          o.ObserverID
      `);

      // Transform data to match expected format
      const exams = examsResult.rows.map(exam => ({
        id: exam.examid,
        name: exam.examname,
        date: new Date(exam.examdate),
        startTime: exam.starttime,
        endTime: exam.endtime,
        startMin: parseTimeToMinutes(exam.starttime),
        endMin: parseTimeToMinutes(exam.endtime),
        courseName: exam.coursename,
        roomNum: exam.roomnum,
        scheduleId: exam.scheduleid
      }));

      const observers = observersResult.rows.map(observer => ({
        id: observer.observerid,
        name: observer.name,
        title: observer.title,
        isDoctor: observer.title && observer.title.toLowerCase().includes('dr'),
        availability: observer.availability,
        timeSlots: observer.time_slots || [],
        currentWorkload: observer.current_workload || 0
      }));

      return { exams, observers };
      
    } catch (error) {
      this.log(`[GREEDY] Error loading data: ${error.message}`);
      throw error;
    }
  }

  // Pure Greedy Algorithm (optimized single-pass) - from LP service
  async runPureGreedyAlgorithm(data, examIds, algorithmStartTime) {
    try {
      this.log(`[GREEDY] Using optimized single-pass greedy algorithm for ${data.exams.length} exams`);
      
      // Store exam data for conflict checking
      this.currentExamData = data.exams;
      
      const assignments = [];
      const observerWorkload = new Map();
      
      // Initialize workload tracking
      data.observers.forEach(obs => observerWorkload.set(obs.id, obs.currentWorkload));
      
      // Pre-filter observers by role
      const doctors = data.observers.filter(obs => obs.isDoctor);
      const secretaries = data.observers.filter(obs => !obs.isDoctor);
      
      this.log(`[GREEDY] Available: ${doctors.length} doctors, ${secretaries.length} secretaries`);
      
      // Sort exams chronologically for better assignment order
      const sortedExams = [...data.exams].sort((a, b) => {
        const dateCompare = a.date.getTime() - b.date.getTime();
        return dateCompare !== 0 ? dateCompare : a.startMin - b.startMin;
      });
      
      let assignedCount = 0;
      
      for (const exam of sortedExams) {
        // Find available doctors (heads)
        const availableDoctors = doctors.filter(doctor => 
          ObserverUtils.canObserverTakeExam(doctor, exam) && 
          this.isObserverFreeForExam(doctor, exam, assignments)
        );
        
        // Find available secretaries
        const availableSecretaries = secretaries.filter(secretary => 
          ObserverUtils.canObserverTakeExam(secretary, exam) && 
          this.isObserverFreeForExam(secretary, exam, assignments)
        );
        
        if (availableDoctors.length > 0 && availableSecretaries.length > 0) {
          // Choose least loaded observers (greedy choice)
          const head = availableDoctors.reduce((min, obs) => 
            observerWorkload.get(obs.id) < observerWorkload.get(min.id) ? obs : min
          );
          const secretary = availableSecretaries.reduce((min, obs) => 
            observerWorkload.get(obs.id) < observerWorkload.get(min.id) ? obs : min
          );
          
          // Create assignment
          assignments.push({
            examId: exam.id,
            headId: head.id,
            secretaryId: secretary.id
          });
          
          // Update workload
          observerWorkload.set(head.id, observerWorkload.get(head.id) + 1);
          observerWorkload.set(secretary.id, observerWorkload.get(secretary.id) + 1);
          assignedCount++;
          
          this.log(`[GREEDY] Assigned exam ${exam.id} to head: ${head.name}, secretary: ${secretary.name}`);
        } else {
          this.log(`[GREEDY] Could not assign exam ${exam.id} - available doctors: ${availableDoctors.length}, available secretaries: ${availableSecretaries.length}`);
        }
      }
      
      // Apply assignments to database
      await this.applySolution(assignments, examIds);
      
      const totalTimeMs = Date.now() - algorithmStartTime;
      this.log(`[GREEDY] Completed in ${totalTimeMs}ms! ${assignedCount}/${data.exams.length} exams assigned (${(assignedCount/data.exams.length*100).toFixed(1)}%)`);
      
      // Format results in the expected structure
      const results = {
        successful: assignments.map(assignment => ({
          examId: assignment.examId,
          examName: data.exams.find(e => e.id === assignment.examId)?.name || 'Unknown',
          headId: assignment.headId,
          secretaryId: assignment.secretaryId,
          head: data.observers.find(o => o.id === assignment.headId)?.name || 'Unknown',
          secretary: data.observers.find(o => o.id === assignment.secretaryId)?.name || 'Unknown'
        })),
        failed: data.exams.filter(exam => 
          !assignments.some(a => a.examId === exam.id)
        ).map(exam => ({
          examId: exam.id,
          examName: exam.name,
          reason: 'No available observers'
        }))
      };
      
      // Save performance metrics
      await this.savePerformanceReport(assignments, data);
      
      return results;
      
    } catch (error) {
      this.log(`[GREEDY] Error: ${error.message}`);
      throw error;
    }
  }

  // Check if observer is free for an exam (from LP service)
  isObserverFreeForExam(observer, exam, existingAssignments) {
    // Check if observer is already assigned to overlapping exams
    for (const assignment of existingAssignments) {
      // Skip if observer is not involved in this assignment
      if (assignment.headId !== observer.id && assignment.secretaryId !== observer.id) {
        continue;
      }
      
      // Find the exam for this assignment
      const assignedExam = this.currentExamData?.find(e => e.id === assignment.examId);
      if (!assignedExam) {
        this.log(`[CONFLICT-DEBUG] Could not find exam ${assignment.examId} in currentExamData`);
        continue;
      }
      
      // Check for time overlap on same date
      if (assignedExam.date.getTime() === exam.date.getTime()) {
        // Use proper overlap detection
        const hasOverlap = examsOverlap(assignedExam, exam);
        
        if (hasOverlap) {
          this.log(`[CONFLICT-DEBUG] OVERLAP DETECTED: Observer ${observer.name} (${observer.id}) already assigned to exam ${assignedExam.id} (${assignedExam.startTime}-${assignedExam.endTime}), conflicts with exam ${exam.id} (${exam.startTime}-${exam.endTime})`);
          return false; // Observer is busy - conflict detected
        }
      }
    }
    
    return true; // Observer is free
  }

  // Apply solution to database
  async applySolution(assignments, examIds) {
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Clear existing assignments
      await client.query(`
        DELETE FROM ExamAssignment 
        WHERE ExamID = ANY($1)`,
        [examIds]
      );
      
      await client.query(`
        UPDATE ExamSchedule 
        SET ExamHead = NULL, ExamSecretary = NULL, Status = 'unassigned'
        WHERE ExamID = ANY($1)`,
        [examIds]
      );
      
      // Insert new assignments
      if (assignments.length > 0) {
        const assignmentInserts = [];
        const examUpdates = [];
        
        for (const assignment of assignments) {
          assignmentInserts.push(
            [assignment.examId, assignment.scheduleId, assignment.headId, 'head', 'active'],
            [assignment.examId, assignment.scheduleId, assignment.secretaryId, 'secretary', 'active']
          );
          
          examUpdates.push({
            examId: assignment.examId,
            headId: assignment.headId,
            secretaryId: assignment.secretaryId
          });
        }
        
        // Insert assignments
        const insertQuery = `
          INSERT INTO ExamAssignment (ExamID, ScheduleID, ObserverID, Role, Status)
          VALUES ${assignmentInserts.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
        `;
        await client.query(insertQuery, assignmentInserts.flat());
        
        // Update exam schedules
        if (examUpdates.length > 0) {
          const safeUpdateQuery = buildSafeBulkUpdateQuery(examUpdates);
          if (safeUpdateQuery) {
            await client.query(safeUpdateQuery.query, safeUpdateQuery.params);
          }
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      this.log(`[GREEDY] Applied ${assignments.length} assignments to database`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.log(`[GREEDY] Error applying solution: ${error.message}`);
      throw error;
    }
  }

  // Save performance report
  async savePerformanceReport(assignments, data) {
    try {
      const timestamp = new Date().toISOString();
      const report = {
        algorithm: 'greedy',
        timestamp: timestamp,
        totalExams: data.exams.length,
        assignedExams: assignments.length,
        successRate: (assignments.length / data.exams.length * 100).toFixed(2),
        executionTime: Date.now() - this.startTime,
        assignments: assignments.map(a => ({
          examId: a.examId,
          headId: a.headId,
          secretaryId: a.secretaryId
        }))
      };
      
      const reportDir = path.join(__dirname, '../../reports');
      await fs.mkdir(reportDir, { recursive: true });
      
      const filename = `greedy-algorithm-${timestamp.replace(/[:.]/g, '-')}.json`;
      const reportPath = path.join(reportDir, filename);
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      this.log(`[GREEDY] Performance report saved: ${filename}`);
      
    } catch (error) {
      this.log(`[GREEDY] Error saving performance report: ${error.message}`);
    }
  }

  // Legacy method for backward compatibility
  async assignObserversToExam(examIds) {
    return this.assignObserversWithGreedy(examIds);
  }
}

module.exports = new GreedyAssignmentService(); 