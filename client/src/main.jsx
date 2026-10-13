// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Automatically route any localhost API calls to VITE_API_URL or production backend in production
const PROD_API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://community-hero-y0t7.onrender.com/api' : '');
if (PROD_API_BASE) {
  const cleanProdBase = PROD_API_BASE.replace(/\/$/, '');
  const apiBase = cleanProdBase.endsWith('/api') ? cleanProdBase : `${cleanProdBase}/api`;
  const rootBase = cleanProdBase.replace(/\/api$/, '');
  axios.interceptors.request.use((config) => {
    if (config.url && config.url.includes('http://localhost:5000/api')) {
      config.url = config.url.replace('http://localhost:5000/api', apiBase);
    } else if (config.url && config.url.startsWith('http://localhost:5000')) {
      config.url = config.url.replace('http://localhost:5000', rootBase);
    }
    return config;
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);