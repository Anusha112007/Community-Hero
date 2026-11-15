import axios from 'axios';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://community-hero-y0t7.onrender.com/api'
    : 'http://localhost:5000/api')
).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor to attach Authorization header automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('community_hero_token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle expired tokens or unauthenticated errors cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && error.response.data?.code === 'TOKEN_INVALID') {
      // Clear token if invalid
      localStorage.removeItem('community_hero_token');
      localStorage.removeItem('community_hero_user');
    }
    return Promise.reject(error);
  }
);

export default api;
