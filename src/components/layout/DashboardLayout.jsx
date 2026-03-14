import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  BarChart2,
  Users,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { revokeToken } from "../../api/sheetsClient";
import { cn } from "../../lib/utils";
import { LastUpdatedBar } from "../dashboard/LastUpdatedBar";
import { PollingIndicator } from "../dashboard/PollingIndicator";

const sidebarItems = [
  { to: "/dashboard", label: "대시보드 홈", Icon: LayoutDashboard, exact: true },
  { to: "/dashboard/overview", label: "전체 분석", Icon: BarChart2 },
  { to: "/dashboard/class", label: "학급별", Icon: BookOpen },
  { to: "/dashboard/student", label: "학생 조회", Icon: Users },
  { to: "/dashboard/report", label: "보고서", Icon: FileText },
];

function NavItem({ to, label, Icon: ItemIcon, exact, location }) {
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-gray-100"
      )}
    >
      <ItemIcon size={17} />
      <span>{label}</span>
    </Link>
  );
}

export function DashboardLayout({ children, dataUpdatedAt }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const { schoolName, teacherName, resetSettings } = useSettingsStore();

  const handleLogout = () => {
    revokeToken();
    clearUser();
    resetSettings();
    navigate("/onboarding", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-40 print-hidden">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-bold text-blue-600 text-lg">
              PAPS-IMS
            </Link>
            <span className="text-gray-300 hidden sm:block">|</span>
            <span className="text-gray-700 font-medium hidden sm:block">{schoolName}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <PollingIndicator />
              <LastUpdatedBar dataUpdatedAt={dataUpdatedAt} />
            </div>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Home size={16} />
              <span className="hidden sm:inline">앱으로</span>
            </Link>
            <Link
              to="/settings"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              aria-label="설정"
            >
              <Settings size={16} />
            </Link>
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
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden md:flex flex-col w-52 bg-white border-r py-4 px-3 gap-1 sticky top-14 h-[calc(100vh-3.5rem)] print-hidden">
          {sidebarItems.map((item) => (
            <NavItem key={item.to} {...item} location={location} />
          ))}
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 px-4 py-6 pb-24 md:pb-6 min-w-0">{children}</main>
      </div>

      {/* 모바일 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40 print-hidden">
        <div className="flex">
          {sidebarItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}
              >
                <item.Icon size={20} />
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
