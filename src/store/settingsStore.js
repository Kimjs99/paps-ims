import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSettingsStore = create(
  persist(
    (set) => ({
      sheetId: null,
      schoolName: "",
      schoolYear: new Date().getFullYear(),
      teacherName: "",
      schoolLevel: "중학교",
      isOnboardingComplete: false,
      themeMode: "auto", // "light" | "dark" | "auto"
      maskNames: true, // 학생 실명 블라인드 (김** 표시) — 표시 전용, 시트 원본 불변
      setSheetId: (sheetId) => set({ sheetId }),
      setSchoolInfo: (info) => set(info),
      setThemeMode: (themeMode) => set({ themeMode }),
      setMaskNames: (maskNames) => set({ maskNames }),
      completeOnboarding: () => set({ isOnboardingComplete: true }),
      resetSettings: () =>
        set({
          sheetId: null,
          schoolName: "",
          schoolYear: new Date().getFullYear(),
          teacherName: "",
          schoolLevel: "중학교",
          isOnboardingComplete: false,
        }),
    }),
    { name: "paps-settings" }
  )
);
