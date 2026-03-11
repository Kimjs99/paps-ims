import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

export function LastUpdatedBar({ dataUpdatedAt }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["measurements"] });
  const timeAgo = dataUpdatedAt
    ? formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: ko })
    : "—";

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span>마지막 갱신: {timeAgo}</span>
      <button
        onClick={refresh}
        className="p-1 hover:text-blue-600 transition-colors"
        title="지금 새로고침"
      >
        <RefreshCw size={14} />
      </button>
    </div>
  );
}
