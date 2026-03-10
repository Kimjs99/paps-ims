import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";

export default function Home() {
  const { user } = useAuthStore();
  const { schoolName, schoolYear } = useSettingsStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900">{schoolName} PAPS-IMS</h1>
        <p className="text-gray-600 mt-1">{schoolYear}년 · {user?.name} 선생님</p>
        <div className="mt-8 text-gray-400 text-center py-20">
          Phase 2에서 구현 예정
        </div>
      </div>
    </div>
  );
}
