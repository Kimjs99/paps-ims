import { AlertTriangle, RefreshCw } from "lucide-react";
import { useSchemaCheck } from "../../hooks/useSchemaCheck";

export function SchemaMigrationBanner() {
  const { status, sheetVersion, appVersion, migrate } = useSchemaCheck();

  if (status === "ok" || status === "idle" || status === "checking") return null;

  if (status === "migration_needed") {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={16} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            Google Sheets 업데이트가 필요합니다
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            현재 Sheet 버전({sheetVersion})이 앱 버전({appVersion})보다 낮습니다.
            아래 버튼을 눌러 Sheet 구조를 자동으로 업데이트하세요.
          </p>
        </div>
        <button
          onClick={migrate}
          className="flex-shrink-0 text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 transition-colors"
        >
          Sheet 자동 업데이트
        </button>
      </div>
    );
  }

  if (status === "migrating") {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center gap-3">
        <RefreshCw className="text-blue-600 animate-spin flex-shrink-0" size={16} />
        <p className="text-sm text-blue-800">Google Sheets 업데이트 중...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3">
        <p className="text-sm font-semibold text-red-800">Sheet 업데이트 실패</p>
        <p className="text-xs text-red-700 mt-0.5">
          관리자에게 문의하거나 Sheet를 수동으로 확인하세요.
        </p>
      </div>
    );
  }

  return null;
}
