import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSettingsStore = create(
  persist(
    (set) => ({
      sheetId: null,
      schoolName: "",
      schoolYear: new Date().getFullYear(),
      teacherName: "",
      isOnboardingComplete: false,
      setSheetId: (sheetId) => set({ sheetId }),
      setSchoolInfo: (info) => set(info),
      completeOnboarding: () => set({ isOnboardingComplete: true }),
      resetSettings: () =>
        set({
          sheetId: null,
          schoolName: "",
          schoolYear: new Date().getFullYear(),
          teacherName: "",
          isOnboardingComplete: false,
        }),
    }),
    { name: "paps-settings" }
  )
);
