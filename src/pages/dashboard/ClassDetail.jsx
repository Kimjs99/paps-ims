import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { GradeDistributionChart } from "../../components/charts/GradeDistributionChart";
import { AreaRadarChart } from "../../components/charts/AreaRadarChart";
import { GradeBadge } from "../../components/ui/GradeBadge";
import { useHistogramData, deduplicateMeasurements } from "../../hooks/useDashboard";
import { useMeasurements, useStudents } from "../../hooks/useSheets";
import { Users, CheckCircle, Star } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const HISTOGRAM_TABS = [
  { key: "cardio_value", label: "심폐지구력" },
  { key: "muscle_value", label: "근력" },
  { key: "flexibility_value", label: "유연성" },
  { key: "agility_value", label: "순발력" },
  { key: "bmi", label: "BMI" },
];

function ClassList({ students, measurements }) {
  const classes = [...new Set(
    students.filter((s) => s.is_active).map((s) => `${s.grade}-${s.class}`)
  )].sort();

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">학급 선택</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {classes.map((classId) => {
          const [grade, cls] = classId.split("-");
          const classStudents = students.filter(
            (s) => s.is_active && String(s.grade) === grade && String(s.class) === cls
          );
          const measured = new Set(
            measurements
              .filter((m) => classStudents.some((s) => s.student_id === m.student_id))
              .map((m) => m.student_id)
          ).size;
          const rate = classStudents.length > 0
            ? Math.round((measured / classStudents.length) * 100) : 0;
          return (
            <Link
              key={classId}
              to={`/dashboard/class/${classId}`}
              className="bg-white rounded-xl border p-4 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="text-base font-semibold text-gray-800 mb-1">
                {grade}학년 {cls}반
              </div>
              <div className="text-sm text-gray-500">{classStudents.length}명</div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${rate}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">측정 {rate}%</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ClassDetail() {
  const { classId } = useParams();
  const { data: allStudents = [], isLoading: sLoading } = useStudents();
  const { data: allMeasurements = [], isLoading: mLoading, dataUpdatedAt } = useMeasurements();
  const [histTab, setHistTab] = useState("cardio_value");

  const isLoading = sLoading || mLoading;

  if (isLoading) {
    return (
      <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
        <div className="flex items-center justify-center h-64 text-gray-400">
          데이터를 불러오는 중...
        </div>
      </DashboardLayout>
    );
  }

  // classId 없으면 학급 목록
  if (!classId) {
    return (
      <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
        <ClassList students={allStudents} measurements={allMeasurements} />
      </DashboardLayout>
    );
  }

  const [grade, cls] = classId.split("-");
  const classStudents = allStudents.filter(
    (s) => s.is_active && String(s.grade) === grade && String(s.class) === cls
  );
  const classMeasurements = allMeasurements.filter((m) =>
    classStudents.some((s) => s.student_id === m.student_id)
  );
  // 학생+연도 단위 중복 제거 — KPI·등급·영역 통계에 사용
  const dedupedMeasurements = deduplicateMeasurements(classMeasurements);

  // 히스토그램용 — 학생별 측정값 평균 (학생 1명당 1개 레코드)
  const studentAvgMeasurements = (() => {
    const grouped = new Map();
    classMeasurements.forEach((m) => {
      if (!grouped.has(m.student_id)) grouped.set(m.student_id, []);
      grouped.get(m.student_id).push(m);
    });
    const avgField = (records, key) => {
      const vals = records.map((r) => r[key]).filter((v) => v != null && !isNaN(Number(v))).map(Number);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return Array.from(grouped.values()).map((records) => ({
      student_id: records[0].student_id,
      cardio_value: avgField(records, "cardio_value"),
      muscle_value: avgField(records, "muscle_value"),
      flexibility_value: avgField(records, "flexibility_value"),
      agility_value: avgField(records, "agility_value"),
      bmi: avgField(records, "bmi"),
    }));
  })();

  const measuredIds = new Set(dedupedMeasurements.map((m) => m.student_id));
  const measuredCount = measuredIds.size;
  const totalStudents = classStudents.length;
  const completionRate = totalStudents > 0 ? Math.round((measuredCount / totalStudents) * 100) : 0;
  const gradesWithValue = dedupedMeasurements.filter((m) => m.total_grade);
  const avgGrade = gradesWithValue.length > 0
    ? (gradesWithValue.reduce((a, m) => a + m.total_grade, 0) / gradesWithValue.length).toFixed(1)
    : null;

  // 등급 분포
  const gradeDistData = [1, 2, 3, 4, 5].map((g) => ({
    grade: `${g}등급`,
    count: dedupedMeasurements.filter((m) => m.total_grade === g).length,
    gradeNum: g,
  }));

  // 영역별 평균
  const areaAvgs = [
    { area: "심폐지구력", key: "cardio_grade" },
    { area: "근력·근지구력", key: "muscle_grade" },
    { area: "유연성", key: "flexibility_grade" },
    { area: "순발력", key: "agility_grade" },
    { area: "BMI", key: "bmi_grade" },
  ].map(({ area, key }) => {
    const vals = dedupedMeasurements.filter((m) => m[key]).map((m) => Number(m[key]));
    return {
      area,
      value: vals.length > 0
        ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
        : null,
    };
  });

  return (
    <DashboardLayout dataUpdatedAt={dataUpdatedAt}>
      <div className="space-y-5 max-w-5xl">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard/class" className="text-sm text-gray-400 hover:text-gray-600">
            ← 학급 목록
          </Link>
          <h2 className="text-xl font-bold text-gray-800">{grade}학년 {cls}반</h2>
        </div>

        {/* KPI 3개 */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard title="전체 학생" value={`${totalStudents}명`} icon={Users} color="blue" />
          <KpiCard
            title="측정 완료율"
            value={`${completionRate}%`}
            subtitle={`${measuredCount}명 완료`}
            icon={CheckCircle}
            color="green"
          />
          <KpiCard
            title="평균 종합 등급"
            value={avgGrade ? `${avgGrade}등급` : "—"}
            icon={Star}
            color="amber"
          />
        </div>

        {/* 등급 분포 */}
        <GradeDistributionChart data={gradeDistData} />

        {/* 히스토그램 + 레이더 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">체력요소별 평균 분포</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {HISTOGRAM_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setHistTab(t.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                    histTab === t.key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <HistogramChart measurements={studentAvgMeasurements} field={histTab} />
          </div>
          <AreaRadarChart data={areaAvgs} title={`${grade}학년 ${cls}반 영역별 평균`} />
        </div>

        {/* 학생 목록 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">학생 목록</h3>
          </div>
          <div className="divide-y">
            {classStudents.map((s) => {
              const m = dedupedMeasurements.find((x) => x.student_id === s.student_id);
              return (
                <div key={s.student_id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-400">{s.student_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <GradeBadge grade={m?.total_grade} />
                    {m?.measured_at && (
                      <span className="text-xs text-gray-400">{m.measured_at.slice(0, 10)}</span>
                    )}
                    {!m && <span className="text-xs text-gray-400">미측정</span>}
                    <Link
                      to={`/dashboard/student/${s.student_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      상세
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function HistogramChart({ measurements, field }) {
  const data = useHistogramData(measurements, field);
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        데이터가 없습니다
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="range" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickFormatter={(v) => `${v}명`} />
        <Tooltip formatter={(v) => [`${v}명`, "학생 수"]} />
        <Bar dataKey="count" fill="#2563EB" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
