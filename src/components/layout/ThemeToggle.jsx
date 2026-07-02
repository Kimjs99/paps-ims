import { Sun, Moon, Monitor } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore";
import { cn } from "../../lib/utils";

const MODES = [
  { mode: "light", Icon: Sun, label: "주간 모드" },
  { mode: "auto", Icon: Monitor, label: "자동 모드" },
  { mode: "dark", Icon: Moon, label: "야간 모드" },
];

// ☀/🖥/🌙 테마 토글 버튼 그룹 — AppLayout·DashboardLayout 공용
// DOM 구조/클래스는 기존과 동일하게 유지 (다크 모드 스타일이 클래스에 의존)
// iconClassName: AppLayout 방식(h-3.5 w-3.5), iconSize: DashboardLayout 방식(size={14})
export function ThemeToggle({ className, iconClassName, iconSize }) {
  const { themeMode, setThemeMode } = useSettingsStore();

  return (
    <div className={cn("flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5", className)}>
      {MODES.map(({ mode, Icon, label }) => (
        <button
          key={mode}
          onClick={() => setThemeMode(mode)}
          aria-label={label}
          className={cn(
            "p-1 rounded-md transition-colors",
            themeMode === mode
              ? "bg-white dark:bg-gray-900 text-blue-600 shadow-sm"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <Icon className={iconClassName} size={iconSize} />
        </button>
      ))}
    </div>
  );
}
