import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface UIState {
  toasts: ToastItem[];
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: number) => void;
}

let nextToastId = 1;

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  showToast: (message, variant = "info") => {
    const id = nextToastId++;
    set({ toasts: [...get().toasts, { id, message, variant }] });
    window.setTimeout(() => get().dismissToast(id), 5000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
