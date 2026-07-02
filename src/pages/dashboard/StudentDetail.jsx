import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { AreaRadarChart } from "../../components/charts/AreaRadarChart";
import { YearlyTrendChart } from "../../components/charts/YearlyTrendChart";
import { StudentSearch } from "../../components/dashboard/StudentSearch";
import { useStudents, useMeasurements } from "../../hooks/useSheets";
import { StudentAvgGradeCards } from "./StudentAvgGradeCards";
import { StudentHistoryTable } from "./StudentHistoryTable";
import {
  AREA_KEYS, AREA_LABELS, AREA_ITEMS,
  selectRawMeasurements, getAvailableYears, selectTrendMeasurements,
  buildTrendData, buildAvgRecord,
} from "./studentDetailData";

export default function StudentDetail() {
  const { studentId } = useParams();
  const { data: students = [], isLoading: sLoading } = useStudents();
  const { data: measurements = [], isLoading: mLoading, dataUpdatedAt } = useMeasurements();

  const [selectedAreas, setSelectedAreas] = useState(["total"]);
  const [selectedYear, setSelectedYear] = useState(null);

  const isLoading = sLoading || mLoading;

  // 해당 학생의 전체 원본 측정 이력 (최신순)
  const rawMeasurements = useMemo(
    () => selectRawMeasurements(measurements, studentId),
    [measurements, studentId]
  );

  // 측정 연도 목록 (최신순)
  const availableYears = useMemo(() => getAvailableYears(rawMeasurements), [rawMeasurements]);

  // 선택 연도 (null이면 최신 연도로 자동 적용)
  const activeYear = selectedYear ?? availableYears[0] ?? null;

  // 추이 차트 데이터 (선택 연도, X축: 측정일자)
  const trendData = useMemo(
    () => buildTrendData(selectTrendMeasurements(rawMeasurements, activeYear)),
    [rawMeasurements, activeYear]
  );

  // 전체 기간 영역별 평균 등급 + 평균 측정값 (레이더 + 평균 카드 + 테이블 평균 행용)
  const avgRecord = useMemo(() => buildAvgRecord(rawMeasurements), [rawMeasurements]);

  const toggleArea = (area) =>
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );

  if (isLoading) {
    return (
      <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
        <div className="flex items-center justify-center h-64 text-gray-400">
          데이터를 불러오는 중...
        </div>
      </DashboardLayout>
    );
  }

  if (!studentId) {
    return (
      <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
        <StudentSearch students={students} />
      </DashboardLayout>
    );
  }

  const student = students.find((s) => s.student_id === studentId);

  if (!student) {
    return (
      <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
        <div className="text-gray-500 p-6">학생을 찾을 수 없습니다.</div>
      </DashboardLayout>
    );
  }

  // 레이더 차트용 (전체 평균)
  const areaAvgs = AREA_ITEMS.map(({ label, key }) => ({
    area: label,
    value: avgRecord?.[key] ?? null,
  }));

  return (
    <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
      <div className="space-y-5 max-w-4xl">
        {/* 뒤로가기 */}
        <Link to="/dashboard/student" className="text-sm text-gray-400 hover:text-gray-600">
          ← 학생 검색
        </Link>

        {/* 학생 정보 카드 */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{student.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                학번: {student.student_id} · {student.grade}학년 {student.class}반 ·{" "}
                {student.gender === "M" ? "남" : "여"}
              </p>
            </div>
            <div className="ml-auto flex gap-6 text-center">
              <div>
                <div className="text-xs text-gray-400 mb-1">키</div>
                <div className="text-base font-semibold text-gray-700">
                  {student.height ? `${student.height}cm` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">몸무게</div>
                <div className="text-base font-semibold text-gray-700">
                  {student.weight ? `${student.weight}kg` : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 전체 기간 영역별 평균 등급 카드 */}
        {avgRecord && (
          <StudentAvgGradeCards avgRecord={avgRecord} count={rawMeasurements.length} />
        )}

        {/* 레이더 + 체력 등급 추이 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AreaRadarChart data={areaAvgs} title="영역별 평균 등급" />

          {/* 측정일자별 체력 등급 추이 */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-700 shrink-0">체력 등급 추이</span>

              {/* 연도 선택 */}
              {availableYears.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                        activeYear === y
                          ? "bg-gray-800 text-white border-gray-800"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {y}년
                    </button>
                  ))}
                </div>
              )}

              {/* 영역 토글 */}
              <div className="flex flex-wrap gap-1 ml-auto">
                {AREA_KEYS.map((area) => (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                      selectedAreas.includes(area)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {AREA_LABELS[area]}
                  </button>
                ))}
              </div>
            </div>

            <YearlyTrendChart
              data={trendData}
              showAreas={selectedAreas}
              xKey="label"
              bare
            />
          </div>
        </div>

        {/* 전체 측정 이력 테이블 */}
        {rawMeasurements.length > 0 && (
          <StudentHistoryTable rawMeasurements={rawMeasurements} avgRecord={avgRecord} />
        )}
      </div>
    </DashboardLayout>
  );
}
