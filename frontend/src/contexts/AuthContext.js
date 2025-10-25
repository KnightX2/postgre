import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate token with backend - with timeout and retry
  const validateToken = async (token) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('http://localhost:3000/api/auth/validateToken', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return { valid: true, user: data.data.user };
      }
      return { valid: false };
    } catch (error) {
      console.error('Token validation error:', error);
      // Don't invalidate token on network errors, only on actual auth failures
      if (error.name === 'AbortError') {
        console.log('Token validation timeout, keeping session');
        return { valid: true, user: null }; // Keep session on timeout
      }
      return { valid: true, user: null }; // Keep session on network errors
    }
  };

  // Check for existing auth on mount - trust localStorage for long sessions
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const savedRole = localStorage.getItem('userRole');

        if (token && savedRole) {
          // For long sessions, trust the localStorage and don't validate immediately
          // Only validate if there's an actual API call that fails
          console.log('Restoring session from localStorage');
          setUser({ role: savedRole, token });
        }
      } catch (error) {
        console.error('Error during authentication check:', error);
        // Only clear on actual errors, not network issues
        if (error.message && error.message.includes('Invalid token')) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('latestComparison');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (role, token) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', role);
    setUser({ role, token });
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('latestComparison'); // Clear comparison data on logout
    setUser(null);
  };

  const clearSession = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('latestComparison');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    clearSession,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 