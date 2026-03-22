import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Settings, BarChart2, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { revokeToken } from "../../api/sheetsClient";
import { cn } from "../../lib/utils";
import { SchemaMigrationBanner } from "./SchemaMigrationBanner";

const navItems = [
  { to: "/", label: "홈", Icon: Home },
  { to: "/students", label: "학생", Icon: Users },
  { to: "/settings", label: "설정", Icon: Settings },
];

export function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const { schoolName, teacherName, resetSettings, themeMode, setThemeMode } = useSettingsStore();

  const handleLogout = () => {
    revokeToken();
    clearUser();
    resetSettings();
    navigate("/onboarding", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 상단 헤더 */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-bold text-blue-600 text-lg">PAPS-IMS</Link>
            <span className="text-gray-300 hidden sm:block">|</span>
            <span className="text-gray-700 font-medium hidden sm:block">{schoolName}</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const NavIcon = item.Icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    location.pathname === item.to
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <NavIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <Link
              to="/dashboard"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location.pathname.startsWith("/dashboard")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">대시보드</span>
            </Link>
            {/* 테마 토글 */}
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 ml-1">
              {[
                { mode: "light", Icon: Sun, label: "주간 모드" },
                { mode: "auto", Icon: Monitor, label: "자동 모드" },
                { mode: "dark", Icon: Moon, label: "야간 모드" },
              ].map(({ mode, Icon, label }) => (
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
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <div className="ml-2 flex items-center gap-2">
              {user?.picture && (
                <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
              )}
              <span className="text-xs text-gray-500 hidden md:block">
                {teacherName || user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                aria-label="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 스키마 마이그레이션 배너 */}
      <SchemaMigrationBanner />

      {/* 콘텐츠 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* 푸터 */}
      <footer className="border-t bg-white py-3 text-center text-xs text-gray-400">
        © 2026 PAPS-IMS · Developed by Kimjs99
      </footer>
    </div>
  );
}
