import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { requestAccessToken } from "../../api/sheetsClient";
import { toast } from "../../store/toastStore";

// 세션 만료 시 강제 페이지 이동 대신 표시하는 전역 재인증 배너
// — 백그라운드 쿼리 갱신 실패(AUTH_EXPIRED)가 입력 중인 폼을 유실시키지 않도록,
//   사용자 클릭(제스처) 컨텍스트에서 OAuth 팝업을 다시 연다 (팝업 차단 회피)
export function AuthExpiredBanner() {
  const authExpired = useAuthStore((s) => s.authExpired);
  const setAuthExpired = useAuthStore((s) => s.setAuthExpired);
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  if (!authExpired) return null;

  const handleRelogin = async () => {
    setIsPending(true);
    try {
      await requestAccessToken();
      setAuthExpired(false);
      queryClient.invalidateQueries();
      toast.success("다시 로그인되었습니다.");
    } catch (err) {
      console.error("[AuthExpiredBanner]", err);
      toast.error(`로그인 실패: ${err?.message || "알 수 없는 오류"}`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-start gap-3 print-hidden">
      <ShieldAlert className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">세션이 만료되었습니다</p>
        <p className="text-xs text-red-700 mt-0.5">
          입력 중인 내용은 그대로 유지됩니다. 다시 로그인하면 이어서 작업할 수 있습니다.
        </p>
      </div>
      <button
        onClick={handleRelogin}
        disabled={isPending}
        className="flex-shrink-0 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {isPending ? "로그인 중..." : "다시 로그인"}
      </button>
    </div>
  );
}
