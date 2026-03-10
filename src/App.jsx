import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { useSettingsStore } from "./store/settingsStore";

// App 페이지
import Onboarding from "./pages/app/Onboarding";
import Home from "./pages/app/Home";
import ClassMeasure from "./pages/app/ClassMeasure";
import StudentMeasure from "./pages/app/StudentMeasure";
import Students from "./pages/app/Students";
import Settings from "./pages/app/Settings";

// Dashboard 페이지
import DashboardHome from "./pages/dashboard/DashboardHome";
import Overview from "./pages/dashboard/Overview";
import ClassDetail from "./pages/dashboard/ClassDetail";
import StudentDetail from "./pages/dashboard/StudentDetail";
import Report from "./pages/dashboard/Report";

const queryClient = new QueryClient({
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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
          <Route path="/dashboard/class/:classId" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
          <Route path="/dashboard/student/:studentId" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
          <Route path="/dashboard/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          {/* 기본 리디렉션 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
