import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sheetOpen: false,
  sheetContent: null,
  
  openSheet: (content) => set({ sheetOpen: true, sheetContent: content }),
  closeSheet: () => set({ sheetOpen: false, sheetContent: null }),
}));
