import { create } from 'zustand';

const SIDEBAR_KEY = 'flowmind_sidebar_collapsed';

export const useUIStore = create((set) => ({
  sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === 'true',

  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return { sidebarCollapsed: next };
    }),

  collapseSidebar: () => {
    localStorage.setItem(SIDEBAR_KEY, 'true');
    set({ sidebarCollapsed: true });
  },

  expandSidebar: () => {
    localStorage.setItem(SIDEBAR_KEY, 'false');
    set({ sidebarCollapsed: false });
  },

  // Sheet / drawer state
  sheetOpen: false,
  sheetContent: null,
  openSheet: (content) => set({ sheetOpen: true, sheetContent: content }),
  closeSheet: () => set({ sheetOpen: false, sheetContent: null }),
}));
