import { useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { GRADE_COLORS, GRADE_LABELS } from "../../constants/paps";

const AREA_KEYS = [
  { area: "심폐지구력", key: "cardio_grade" },
  { area: "근력·근지구력", key: "muscle_grade" },
  { area: "유연성", key: "flexibility_grade" },
  { area: "순발력", key: "agility_grade" },
  { area: "BMI", key: "bmi_grade" },
];

function GradeBadge({ label, grade }) {
  const color = grade ? GRADE_COLORS[grade] : "#9ca3af";
  return (
    <div
      className="flex flex-col items-center px-3 py-2 rounded-lg text-white text-center"
      style={{ backgroundColor: color, minWidth: 70 }}
    >
      <span className="text-xs opacity-90">{label}</span>
      <span className="text-xl font-bold">{grade ? `${grade}등급` : "-"}</span>
    </div>
  );
}

export function PersonalGrowthCard({ student, measurements, schoolName, schoolYear, id }) {
  // 최신 측정 데이터
  const latest = useMemo(() => {
    if (!measurements.length) return null;
    return [...measurements].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
  }, [measurements]);

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (!latest) return AREA_KEYS.map((a) => ({ area: a.area, display: 0, value: null }));
    return AREA_KEYS.map((a) => ({
      area: a.area,
      value: latest[a.key] ? Number(latest[a.key]) : null,
      display: latest[a.key] ? 6 - Number(latest[a.key]) : 0,
    }));
  }, [latest]);

  // 연도별 종합 등급 추이
  const yearlyTrend = useMemo(() => {
    const byYear = new Map();
    measurements.forEach((m) => {
      if (!byYear.has(m.year) || m.total_grade) byYear.set(m.year, m.total_grade);
    });
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, grade]) => ({ year, grade }));
  }, [measurements]);

  if (!student) return null;

  return (
    <div
      id={id}
      className="bg-white p-5 border rounded-xl"
      style={{ width: "148mm", minHeight: "210mm", boxSizing: "border-box" }}
    >
      {/* 헤더 */}
      <div className="text-center mb-4 border-b pb-3">
        <h2 className="text-base font-bold text-gray-800">
          {schoolYear}학년도 PAPS 체력 성장 카드
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">{schoolName}</p>
      </div>

      {/* 학생 정보 */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-lg font-bold text-gray-800">{student.name}</span>
          <span className="text-sm text-gray-500 ml-2">
            {student.grade}학년 {student.class}반 ({student.gender === "M" ? "남" : "여"})
          </span>
        </div>
        {latest?.total_grade && (
          <div
            className="text-center px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: GRADE_COLORS[latest.total_grade] }}
          >
            <div className="text-xs">종합</div>
            <div className="text-2xl font-black">{latest.total_grade}등급</div>
            <div className="text-xs opacity-90">{GRADE_LABELS[latest.total_grade]}</div>
          </div>
        )}
      </div>

      {/* 영역별 등급 배지 */}
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        {AREA_KEYS.map((a) => (
          <GradeBadge
            key={a.key}
            label={a.area}
            grade={latest ? Number(latest[a.key]) || null : null}
          />
        ))}
      </div>

      {/* 레이더 차트 */}
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="area" tick={{ fontSize: 9 }} />
            <PolarRadiusAxis domain={[0, 5]} tick={false} />
            <Radar dataKey="display" stroke="#2563EB" fill="#2563EB" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 text-center -mt-1">※ 차트 외곽일수록 우수한 등급</p>
      </div>

      {/* 연도별 종합 등급 변화 */}
      {yearlyTrend.length > 0 && (
        <div className="border rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-600 mb-2">연도별 종합 등급 변화</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {yearlyTrend.map((item, idx) => (
              <div key={item.year} className="flex items-center gap-2">
                {idx > 0 && <span className="text-gray-400 text-xs">→</span>}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-gray-500">{item.year}년</span>
                  <span
                    className="font-bold text-sm"
                    style={{ color: item.grade ? GRADE_COLORS[item.grade] : "#9ca3af" }}
                  >
                    {item.grade ? `${item.grade}등급` : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!latest && (
        <p className="text-center text-gray-400 text-sm py-4">측정 데이터가 없습니다.</p>
      )}
    </div>
  );
}
