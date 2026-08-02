import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Login failed';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      register: async (name, email, password, role) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { name, email, password, role });
          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Registration failed';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) { get().logout(); return; }
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
        } catch (_) {
          get().logout();
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          await api.post('/auth/logout', { refreshToken });
        } catch (_) {}
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user });
        } catch (_) {
          get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'audittrail-auth',
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
