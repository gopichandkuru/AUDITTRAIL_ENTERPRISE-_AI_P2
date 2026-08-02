import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  notifications: [],
  unreadCount: 0,
  toast: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    })),

  clearUnread: () => set({ unreadCount: 0 }),

  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 3500);
  },

  dismissToast: () => set({ toast: null }),
}));
