import axios from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://community-hero-y0t7.onrender.com/api' : 'http://localhost:5000/api')).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization header automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('community_hero_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
