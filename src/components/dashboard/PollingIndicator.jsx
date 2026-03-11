import { useIsFetching } from "@tanstack/react-query";

export function PollingIndicator() {
  const isFetching = useIsFetching({ queryKey: ["measurements"] });
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${
          isFetching ? "bg-blue-500 animate-pulse" : "bg-green-500"
        }`}
      />
      <span className="text-xs text-gray-500">
        {isFetching ? "데이터 갱신 중..." : "실시간 연동됨"}
      </span>
    </div>
  );
}
