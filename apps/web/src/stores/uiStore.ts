import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

type Toast = {
  id: string;
  tone: ToastTone;
  message: string;
};

type UiStore = {
  toasts: Toast[];
  onboardingOpen: boolean;
  pushToast: (message: string, tone?: ToastTone) => void;
  removeToast: (id: string) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
};

export const useUiStore = create<UiStore>((set, get) => ({
  toasts: [],
  onboardingOpen: false,
  pushToast: (message, tone = 'info') => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => {
      get().removeToast(id);
    }, 2800);
  },
  removeToast: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
  openOnboarding: () => set({ onboardingOpen: true }),
  closeOnboarding: () => set({ onboardingOpen: false })
}));
