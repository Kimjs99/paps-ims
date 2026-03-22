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
      setSheetId: (sheetId) => set({ sheetId }),
      setSchoolInfo: (info) => set(info),
      setThemeMode: (themeMode) => set({ themeMode }),
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
