import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      notifications: [],
      unreadCount: 0,
      sidebarOpen: true,

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        set({ theme: newTheme });
      },

      addNotification: (notification) => {
        const id = Date.now().toString();
        set((s) => ({
          notifications: [{ ...notification, id }, ...s.notifications].slice(0, 50),
          unreadCount: s.unreadCount + 1,
        }));
        // Auto-remove after 5 seconds (for toast style)
        setTimeout(() => get().removeNotification(id), 5000);
      },

      showToast: (message, type = 'info') => {
        get().addNotification({ message, type });
      },

      clearUnread: () => set({ unreadCount: 0 }),

      removeNotification: (id) => {
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
      },

      clearNotifications: () => set({ notifications: [] }),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'audittrail-ui',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);
