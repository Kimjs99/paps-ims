import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { email, name, picture }
      isAuthenticated: false,
      // 세션 만료 재인증 배너 표시용 — persist 제외 (새 세션에서는 항상 false로 시작)
      authExpired: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearUser: () => set({ user: null, isAuthenticated: false, authExpired: false }),
      setAuthExpired: (authExpired) => set({ authExpired }),
    }),
    {
      name: "paps-auth",
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
