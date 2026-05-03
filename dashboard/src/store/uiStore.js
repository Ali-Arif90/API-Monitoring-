import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  sidebarOpen: true,
  notifications: [],

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (v) => set({ sidebarOpen: v }),

  addNotification: (notif) => {
    const id = Date.now();
    set(s => ({ notifications: [{ ...notif, id }, ...s.notifications].slice(0, 20) }));
    if (notif.duration !== 0) {
      setTimeout(() => get().removeNotification(id), notif.duration ?? 4000);
    }
    return id;
  },
  removeNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
  clearNotifications: () => set({ notifications: [] }),
}));
