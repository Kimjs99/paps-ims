// 전체 기간 영역별 평균 등급 카드 그리드 — StudentDetail.jsx에서 분리 (colocated, props 기반)
import { GRADE_COLORS } from "../../constants/paps";
import { AREA_ITEMS } from "./studentDetailData";

export function StudentAvgGradeCards({ avgRecord, count }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">
        영역별 평균 등급 (전체 측정 기간 · {count}회)
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {AREA_ITEMS.map(({ label, key }) => {
          const val = avgRecord[key];
          const color = val != null ? GRADE_COLORS[Math.round(val)] : undefined;
          return (
            <div key={key} className="bg-white rounded-xl border p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              {val != null ? (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {val}등급
                </span>
              ) : (
                <span className="text-gray-400 text-sm">-</span>
              )}
            </div>
          );
        })}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
          <div className="text-xs text-blue-600 font-medium mb-1">종합</div>
          {avgRecord.total_grade != null ? (
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white"
              style={{ backgroundColor: GRADE_COLORS[Math.round(avgRecord.total_grade)] }}
            >
              {avgRecord.total_grade}등급
            </span>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      </div>
    </div>
  );
}
