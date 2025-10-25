import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserCheck, FaCalendarAlt, FaClipboardList, FaSpinner, FaSignOutAlt } from 'react-icons/fa';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.scss';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalObservers: 0,
    totalSchedules: 0,
    totalAssignments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { get } = useApi();
  const { user, isAuthenticated, isAdmin, logout, clearSession } = useAuth();

  // Debug information
  useEffect(() => {
    console.log('Dashboard Debug Info:', {
      user,
      isAuthenticated,
      isAdmin,
      hasToken: !!localStorage.getItem('authToken'),
      hasRole: !!localStorage.getItem('userRole')
    });
  }, [user, isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!isInitialized) {
      fetchDashboardStats();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch users count
      const usersResponse = await get('/users');

      // Fetch observers count
      const observersResponse = await get('/users/observers');

      // Fetch schedules count
      const schedulesResponse = await get('/exams/schedules/all');

      // Fetch assignments count (schedule assignments)
      const assignmentsResponse = await get('/exams/schedule-assignments');

      setStats({
        totalUsers: usersResponse.length || 0,
        totalObservers: observersResponse.length || 0,
        totalSchedules: schedulesResponse.schedules?.length || schedulesResponse.length || 0,
        totalAssignments: assignmentsResponse.length || 0
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, description }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        <Icon />
      </div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        <p className="stat-title">{title}</p>
        <p className="stat-description">{description}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="loading-container">
            <FaSpinner className="loading-spinner" />
            <p>Loading dashboard statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <div className="debug-info" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px', fontSize: '12px' }}>
              <strong>Debug Info:</strong><br/>
              Authenticated: {isAuthenticated ? 'Yes' : 'No'}<br/>
              Admin: {isAdmin ? 'Yes' : 'No'}<br/>
              Has Token: {localStorage.getItem('authToken') ? 'Yes' : 'No'}<br/>
              Has Role: {localStorage.getItem('userRole') ? 'Yes' : 'No'}<br/>
              User: {user ? JSON.stringify(user) : 'None'}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button onClick={fetchDashboardStats} className="retry-button">
                Try Again
              </button>
              <button 
                onClick={() => {
                  clearSession();
                  window.location.href = '/login';
                }} 
                style={{ 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                <FaSignOutAlt /> Clear Session & Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="welcome-message">
          <h2>Welcome to the Admin Dashboard</h2>
          <p>Manage your exam schedules and observers efficiently</p>
        </div>

        <div className="stats-grid">
          <StatCard
            icon={FaUsers}
            title="Total Users"
            value={stats.totalUsers}
            color="var(--primary-500)"
            description="Registered system users"
          />
          <StatCard
            icon={FaUserCheck}
            title="Total Observers"
            value={stats.totalObservers}
            color="var(--success-500)"
            description="Available exam observers"
          />
          <StatCard
            icon={FaCalendarAlt}
            title="Exam Schedules"
            value={stats.totalSchedules}
            color="var(--warning-500)"
            description="Uploaded exam schedules"
          />
          <StatCard
            icon={FaClipboardList}
            title="Assignments"
            value={stats.totalAssignments}
            color="var(--info-500)"
            description="Observer assignments"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;