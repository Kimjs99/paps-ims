import { version } from "../../../package.json";

// 공용 푸터 — 제작자·버전·저작권·사용 범위 고지 (AppLayout·DashboardLayout 공용)
export function AppFooter({ className = "" }) {
  return (
    <footer className={`border-t bg-white py-3 text-center text-xs text-gray-400 ${className}`}>
      <p>
        © 2026 PAPS-IMS v{version} · Developed by Kimjs99
      </p>
      <p className="mt-0.5">
        본 시스템은 학교 체육(PAPS) 교육 용도로 제작되었으며, 교육 목적 외 상업적 사용을 금지합니다.
      </p>
    </footer>
  );
}
