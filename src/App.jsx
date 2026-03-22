import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { useSettingsStore } from "./store/settingsStore";
import { initGoogleAuth } from "./api/sheetsClient";
import { useTheme } from "./hooks/useTheme";
import { Toaster } from "./components/ui/Toaster";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";

// 즉시 로드 (온보딩 진입점)
import Onboarding from "./pages/app/Onboarding";

// 지연 로드 — App 페이지
const Home = lazy(() => import("./pages/app/Home"));
const ClassMeasure = lazy(() => import("./pages/app/ClassMeasure"));
const StudentMeasure = lazy(() => import("./pages/app/StudentMeasure"));
const Students = lazy(() => import("./pages/app/Students"));
const Settings = lazy(() => import("./pages/app/Settings"));

// 지연 로드 — Dashboard 페이지
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const Overview = lazy(() => import("./pages/dashboard/Overview"));
const ClassDetail = lazy(() => import("./pages/dashboard/ClassDetail"));
const StudentDetail = lazy(() => import("./pages/dashboard/StudentDetail"));
const Report = lazy(() => import("./pages/dashboard/Report"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error?.message === "AUTH_EXPIRED") {
        useAuthStore.getState().clearUser();
        window.location.href = "/onboarding";
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error?.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const { isOnboardingComplete } = useSettingsStore();
  if (!isAuthenticated || !isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  useTheme();

  // 새로고침 후에도 tokenClient가 초기화되도록 앱 시작 시 GIS 초기화
  useEffect(() => {
    initGoogleAuth().catch(() => {
      // GIS 스크립트 미로드 시 무시 (온보딩에서 재시도)
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/onboarding" element={<Onboarding />} />
              {/* Web App */}
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/measure/:classId" element={<ProtectedRoute><ClassMeasure /></ProtectedRoute>} />
              <Route path="/measure/:classId/:studentId" element={<ProtectedRoute><StudentMeasure /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              {/* Dashboard */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
              <Route path="/dashboard/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
              <Route path="/dashboard/class" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
              <Route path="/dashboard/class/:classId" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
              <Route path="/dashboard/student" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
              <Route path="/dashboard/student/:studentId" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
              <Route path="/dashboard/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
              {/* 기본 리디렉션 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
