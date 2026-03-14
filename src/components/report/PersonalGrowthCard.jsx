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

const GRADE_KEYS = ["cardio_grade", "muscle_grade", "flexibility_grade", "agility_grade", "bmi_grade", "total_grade"];

function avgGrade(measurements, key) {
  const vals = measurements.map((m) => Number(m[key])).filter((v) => v >= 1 && v <= 5);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function PersonalGrowthCard({ student, measurements, schoolName, schoolYear, id }) {
  // 전체 연도 평균 등급
  const avgGrades = useMemo(() => {
    if (!measurements.length) return null;
    return Object.fromEntries(GRADE_KEYS.map((key) => [key, avgGrade(measurements, key)]));
  }, [measurements]);

  // 등급 표시용 반올림값
  const roundedGrades = useMemo(() => {
    if (!avgGrades) return null;
    return Object.fromEntries(
      Object.entries(avgGrades).map(([key, val]) => [key, val !== null ? Math.round(val) : null])
    );
  }, [avgGrades]);

  // 레이더 차트 데이터 (평균 등급 기반)
  const radarData = useMemo(() => {
    if (!avgGrades) return AREA_KEYS.map((a) => ({ area: a.area, display: 0, value: null }));
    return AREA_KEYS.map((a) => ({
      area: a.area,
      value: avgGrades[a.key],
      display: avgGrades[a.key] !== null ? 6 - avgGrades[a.key] : 0,
    }));
  }, [avgGrades]);

  // 연도별 종합 등급 추이 (연도별 평균)
  const yearlyTrend = useMemo(() => {
    const byYear = new Map();
    measurements.forEach((m) => {
      if (!m.year) return;
      if (!byYear.has(m.year)) byYear.set(m.year, []);
      const g = Number(m.total_grade);
      if (g >= 1 && g <= 5) byYear.get(m.year).push(g);
    });
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, grades]) => ({
        year,
        grade: grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null,
      }));
  }, [measurements]);

  if (!student) return null;

  return (
    <div
      id={id}
      className="bg-white p-5 border rounded-xl"
      style={{ width: "148mm", boxSizing: "border-box" }}
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
        {roundedGrades?.total_grade && (
          <div
            className="text-center px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: GRADE_COLORS[roundedGrades.total_grade] }}
          >
            <div className="text-xs">종합 평균</div>
            <div className="text-2xl font-black">{roundedGrades.total_grade}등급</div>
            <div className="text-xs opacity-90">{GRADE_LABELS[roundedGrades.total_grade]}</div>
          </div>
        )}
      </div>

      {/* 영역별 평균 등급 배지 */}
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        {AREA_KEYS.map((a) => (
          <GradeBadge
            key={a.key}
            label={a.area}
            grade={roundedGrades ? roundedGrades[a.key] : null}
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

      {!avgGrades && (
        <p className="text-center text-gray-400 text-sm py-4">측정 데이터가 없습니다.</p>
      )}
    </div>
  );
}
