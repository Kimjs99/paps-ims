import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Search } from "lucide-react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { GradeBadge } from "../../components/ui/GradeBadge";
import { AreaRadarChart } from "../../components/charts/AreaRadarChart";
import { YearlyTrendChart } from "../../components/charts/YearlyTrendChart";
import { useStudents, useMeasurements } from "../../hooks/useSheets";
import { GRADE_COLORS } from "../../constants/paps";

// KST 측정일시 표기 (예: "2024-03-12 10:00")
const formatDatetime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return v.slice(0, 16).replace("T", " ");
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 16);
};

const AREA_KEYS = ["total", "cardio", "muscle", "flexibility", "agility", "bmi"];
const AREA_LABELS = {
  total: "종합", cardio: "심폐지구력", muscle: "근력·근지구력",
  flexibility: "유연성", agility: "순발력", bmi: "비만",
};

const AREA_ITEMS = [
  { label: "심폐지구력", key: "cardio_grade" },
  { label: "근력·근지구력", key: "muscle_grade" },
  { label: "유연성", key: "flexibility_grade" },
  { label: "순발력", key: "agility_grade" },
  { label: "비만(BMI)", key: "bmi_grade" },
];

function StudentSearch({ students }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => s.is_active)
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          String(s.student_id).includes(q)
      )
      .slice(0, 20);
  }, [students, query]);

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">학생 검색</h2>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="이름 또는 학번으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
      {query.trim() && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {results.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">검색 결과가 없습니다</div>
          ) : (
            <div className="divide-y">
              {results.map((s) => (
                <Link
                  key={s.student_id}
                  to={`/dashboard/student/${s.student_id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{s.student_id}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {s.grade}학년 {s.class}반 · {s.gender === "M" ? "남" : "여"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentDetail() {
  const { studentId } = useParams();
  const { data: students = [], isLoading: sLoading } = useStudents();
  const { data: measurements = [], isLoading: mLoading, dataUpdatedAt } = useMeasurements();

  const [selectedAreas, setSelectedAreas] = useState(["total"]);
  const [selectedYear, setSelectedYear] = useState(null);

  const isLoading = sLoading || mLoading;

  // 해당 학생의 전체 원본 측정 이력 (최신순)
  const rawMeasurements = useMemo(
    () =>
      measurements
        .filter((m) => m.student_id === studentId)
        .sort((a, b) => (b.measured_at ?? b.year) > (a.measured_at ?? a.year) ? 1 : -1),
    [measurements, studentId]
  );

  // 측정 연도 목록 (최신순)
  const availableYears = useMemo(() => {
    const years = [...new Set(rawMeasurements.map((m) => m.year).filter(Boolean))];
    return years.sort((a, b) => b - a);
  }, [rawMeasurements]);

  // 선택 연도 (null이면 최신 연도로 자동 적용)
  const activeYear = selectedYear ?? availableYears[0] ?? null;

  // 추이 차트용: 선택 연도의 측정 기록 (시간순 오름차순)
  const trendMeasurements = useMemo(() => {
    if (!activeYear) return [];
    return [...rawMeasurements]
      .filter((m) => String(m.year) === String(activeYear))
      .sort((a, b) => (a.measured_at ?? "") < (b.measured_at ?? "") ? -1 : 1);
  }, [rawMeasurements, activeYear]);

  // 추이 차트 데이터 (X축: 측정일자)
  const trendData = useMemo(() =>
    trendMeasurements.map((m) => ({
      label: m.measured_at?.slice(0, 10) ?? String(m.year),
      total: m.total_grade != null ? Number(m.total_grade) : null,
      cardio: m.cardio_grade != null ? Number(m.cardio_grade) : null,
      muscle: m.muscle_grade != null ? Number(m.muscle_grade) : null,
      flexibility: m.flexibility_grade != null ? Number(m.flexibility_grade) : null,
      agility: m.agility_grade != null ? Number(m.agility_grade) : null,
      bmi: m.bmi_grade != null ? Number(m.bmi_grade) : null,
    })),
  [trendMeasurements]);

  // 전체 기간 영역별 평균 등급 (레이더 + 평균 등급 카드용)
  const avgRecord = useMemo(() => {
    if (!rawMeasurements.length) return null;
    const keys = ["cardio_grade", "muscle_grade", "flexibility_grade", "agility_grade", "bmi_grade", "total_grade"];
    const result = {};
    keys.forEach((key) => {
      const vals = rawMeasurements
        .map((m) => m[key])
        .filter((v) => v != null && !isNaN(Number(v)))
        .map(Number);
      result[key] = vals.length > 0
        ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
        : null;
    });
    return result;
  }, [rawMeasurements]);

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
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              영역별 평균 등급 (전체 측정 기간 · {rawMeasurements.length}회)
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
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">전체 측정 기록</h3>
              <p className="text-xs text-gray-400 mt-0.5">측정 회차별 원본 등급</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["측정일시", "연도", "심폐", "근력", "유연", "순발", "BMI", "종합"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rawMeasurements.map((m) => (
                    <tr key={m.measurement_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {formatDatetime(m.measured_at)}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-700">{m.year}</td>
                      <td className="px-3 py-2"><GradeBadge grade={m.cardio_grade} /></td>
                      <td className="px-3 py-2"><GradeBadge grade={m.muscle_grade} /></td>
                      <td className="px-3 py-2"><GradeBadge grade={m.flexibility_grade} /></td>
                      <td className="px-3 py-2"><GradeBadge grade={m.agility_grade} /></td>
                      <td className="px-3 py-2"><GradeBadge grade={m.bmi_grade} /></td>
                      <td className="px-3 py-2"><GradeBadge grade={m.total_grade} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
