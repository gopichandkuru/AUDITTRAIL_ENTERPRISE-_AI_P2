import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — try refresh, retry once
let isRefreshing = false;
let waitingQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      const { code } = err.response.data || {};

      if (code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            waitingQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await useAuthStore.getState().refreshSession();
          const newToken = useAuthStore.getState().token;
          waitingQueue.forEach(({ resolve }) => resolve(newToken));
          waitingQueue = [];
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (_) {
          waitingQueue.forEach(({ reject }) => reject(_));
          waitingQueue = [];
          useAuthStore.getState().logout();
        } finally {
          isRefreshing = false;
        }
      } else {
        // Invalid token or other 401 — logout
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(err);
  }
);

export default api;
