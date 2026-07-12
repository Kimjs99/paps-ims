import { Eye, EyeOff } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore";
import { cn } from "../../lib/utils";

// 학생 실명 블라인드 빠른 토글 — AppLayout·DashboardLayout 공용 (테마 토글 옆)
// ON(EyeOff): 김** 마스킹 / OFF(Eye): 실명 표시. 설정 → 개인정보 보호와 같은 상태를 공유
export function MaskToggle({ className, iconClassName, iconSize }) {
  const { maskNames, setMaskNames } = useSettingsStore();

  return (
    <button
      onClick={() => setMaskNames(!maskNames)}
      aria-label={maskNames ? "학생 실명 블라인드 해제" : "학생 실명 블라인드 켜기"}
      title={maskNames ? "실명 블라인드 중 — 클릭하면 실명 표시" : "실명 표시 중 — 클릭하면 블라인드"}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        maskNames
          ? "bg-gray-100 dark:bg-gray-700 text-blue-600"
          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
        className
      )}
    >
      {maskNames
        ? <EyeOff className={iconClassName} size={iconSize} />
        : <Eye className={iconClassName} size={iconSize} />}
    </button>
  );
}
