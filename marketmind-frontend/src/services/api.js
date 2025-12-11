import axios from 'axios';

const API_URL = 'http://localhost:5001/api'; // Update with your backend URL

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    // Backend returns { success: true, user: {...} }
    return response.data.user || response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};

// AI Campaign Generation API
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8001';

export const generateCampaign = async (prompt) => {
  try {
    const response = await fetch(`${AI_API_URL}/api/generate-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate campaign');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Campaign generation error:', error);
    throw error;
  }
};