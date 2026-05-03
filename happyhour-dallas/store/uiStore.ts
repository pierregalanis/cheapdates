import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UIState {
  activeNeighborhood: string | null;
  toasts: Toast[];
  isFilterSheetOpen: boolean;

  setNeighborhood: (neighborhood: string | null) => void;
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: string) => void;
  openFilterSheet: () => void;
  closeFilterSheet: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeNeighborhood: null,
  toasts: [],
  isFilterSheetOpen: false,

  setNeighborhood: (neighborhood) => set({ activeNeighborhood: neighborhood }),

  showToast: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  openFilterSheet:  () => set({ isFilterSheetOpen: true }),
  closeFilterSheet: () => set({ isFilterSheetOpen: false }),
}));
