import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

// In AuthContext.jsx
useEffect(() => {
  const loadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Validate token and fetch user data
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid or expired token');
      }

      const data = await response.json();
      // Backend returns { success: true, user: {...} }
      setUser(data.user || data);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('token'); // Clear invalid token
    } finally {
      setLoading(false);
    }
  };

  loadUser();
}, []);


  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };


  const loginWithGoogle = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        isAuthenticated: !!user,
        setUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};