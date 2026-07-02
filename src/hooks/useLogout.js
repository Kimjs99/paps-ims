import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "../store/settingsStore";
import { revokeToken } from "../api/sheetsClient";

// 로그아웃 공용 훅 — 토큰 취소 → 사용자/설정 초기화 → 온보딩 이동
// (AppLayout · DashboardLayout · Settings 공용)
export function useLogout() {
  const navigate = useNavigate();
  const clearUser = useAuthStore((s) => s.clearUser);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  return () => {
    revokeToken();
    clearUser();
    resetSettings();
    navigate("/onboarding", { replace: true });
  };
}
