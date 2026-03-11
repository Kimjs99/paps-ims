import { create } from "zustand";

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = "success") => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      3500
    );
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// 컴포넌트 외부에서 호출 가능한 toast 헬퍼
export const toast = {
  success: (message) => useToastStore.getState().addToast(message, "success"),
  error: (message) => useToastStore.getState().addToast(message, "error"),
  info: (message) => useToastStore.getState().addToast(message, "info"),
};
