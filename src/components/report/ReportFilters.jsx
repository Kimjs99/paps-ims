// 보고서 공통 필터 카드 — Report.jsx에서 분리 (props 기반, 필터 상태는 페이지가 보유)
import { ChevronRight } from "lucide-react";

export function ReportFilters({
  filterGrade, setFilterGrade,
  filterClass, setFilterClass,
  filterYear, setFilterYear,
  availableClasses, availableYears,
  measurementCount, studentCount,
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">필터</h3>
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterGrade}
          onChange={(e) => { setFilterGrade(e.target.value); setFilterClass(""); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 학년</option>
          {[1, 2, 3].map((g) => <option key={g} value={g}>{g}학년</option>)}
        </select>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 반</option>
          {availableClasses.map((c) => <option key={c} value={c}>{c}반</option>)}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 연도</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <div className="flex items-center text-sm text-gray-500">
          <ChevronRight size={14} />
          <span>
            {measurementCount}건 측정 / {studentCount}명 대상
          </span>
        </div>
      </div>
    </div>
  );
}
