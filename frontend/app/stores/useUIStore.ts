import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UIState {
  isLoading: boolean;
  modalOpen: boolean;
  toastQueue: Toast[];
  
  setLoading: (isLoading: boolean) => void;
  setModalOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isLoading: false,
      modalOpen: false,
      toastQueue: [],
      
      setLoading: (isLoading) => set({ isLoading }),
      setModalOpen: (modalOpen) => set({ modalOpen }),
      
      addToast: (toast) => {
        const id = Date.now().toString();
        set((state) => ({
          toastQueue: [...state.toastQueue, { ...toast, id }],
        }));
        
        // Auto remove after 5 seconds
        setTimeout(() => {
          set((state) => ({
            toastQueue: state.toastQueue.filter((t) => t.id !== id),
          }));
        }, 5000);
      },
      
      removeToast: (id) =>
        set((state) => ({
          toastQueue: state.toastQueue.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ modalOpen: state.modalOpen }),
    }
  )
);
