import { useMemo } from "react";
import { GRADE_COLORS } from "../../constants/paps";

// 영역별 등급 분포 집계
function calcAreaStats(measurements, areaGradeKey) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let count = 0;
  measurements.forEach((m) => {
    const g = Number(m[areaGradeKey]);
    if (g >= 1 && g <= 5) {
      dist[g]++;
      sum += g;
      count++;
    }
  });
  const avg = count > 0 ? (sum / count).toFixed(1) : "-";
  return { dist, avg, count };
}

const AREAS = [
  { label: "심폐지구력", gradeKey: "cardio_grade", valueKey: "cardio_value" },
  { label: "근력·근지구력", gradeKey: "muscle_grade", valueKey: "muscle_value" },
  { label: "유연성", gradeKey: "flexibility_grade", valueKey: "flexibility_value" },
  { label: "순발력", gradeKey: "agility_grade", valueKey: "agility_value" },
  { label: "비만(BMI)", gradeKey: "bmi_grade", valueKey: "bmi" },
];

function GradeCell({ grade }) {
  if (!grade) return <td className="border px-2 py-1 text-center text-gray-400">-</td>;
  const color = GRADE_COLORS[grade] || "#6b7280";
  return (
    <td className="border px-2 py-1 text-center font-semibold" style={{ color }}>
      {grade}
    </td>
  );
}

export function ClassReportPreview({ measurements, students, schoolName, schoolYear, className, teacherName }) {
  const areaStats = useMemo(
    () => AREAS.map((a) => ({ ...a, ...calcAreaStats(measurements, a.gradeKey) })),
    [measurements]
  );

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.student_id, s])),
    [students]
  );

  // 측정 완료 학생 목록 (이름순 정렬)
  const measuredStudents = useMemo(() => {
    return measurements
      .map((m) => ({ m, s: studentMap.get(m.student_id) }))
      .filter(({ s }) => s)
      .sort((a, b) => {
        if (a.s.grade !== b.s.grade) return Number(a.s.grade) - Number(b.s.grade);
        if (a.s.class !== b.s.class) return Number(a.s.class) - Number(b.s.class);
        return (a.s.name || "").localeCompare(b.s.name || "");
      });
  }, [measurements, studentMap]);

  return (
    <div>
      {/* ─── 1페이지: 요약 통계 ─── */}
      <div
        id="report-page-1"
        className="bg-white p-8"
        style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
      >
        {/* 헤더 */}
        <div className="text-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">{schoolYear}학년도 PAPS 체력측정 결과 보고서</h1>
          <div className="flex justify-center gap-8 mt-2 text-sm text-gray-600">
            <span>학교: {schoolName || "-"}</span>
            <span>대상: {className || "전체"}</span>
            <span>담당교사: {teacherName || "-"}</span>
            <span>측정 인원: {measurements.length}명</span>
          </div>
        </div>

        {/* 영역별 요약 통계 테이블 */}
        <h2 className="text-base font-semibold text-gray-700 mb-3">영역별 요약 통계</h2>
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-blue-50">
              <th className="border px-3 py-2 text-left">영역</th>
              <th className="border px-3 py-2 text-center">측정수</th>
              <th className="border px-3 py-2 text-center">평균등급</th>
              {[1, 2, 3, 4, 5].map((g) => (
                <th
                  key={g}
                  className="border px-3 py-2 text-center font-semibold"
                  style={{ color: GRADE_COLORS[g] }}
                >
                  {g}등급
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areaStats.map((area) => (
              <tr key={area.label} className="hover:bg-gray-50">
                <td className="border px-3 py-2 font-medium">{area.label}</td>
                <td className="border px-3 py-2 text-center">{area.count}명</td>
                <td className="border px-3 py-2 text-center font-semibold text-blue-600">
                  {area.avg}등급
                </td>
                {[1, 2, 3, 4, 5].map((g) => (
                  <td key={g} className="border px-3 py-2 text-center">
                    {area.dist[g]}명
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 종합 등급 분포 */}
        <h2 className="text-base font-semibold text-gray-700 mb-3">종합 등급 분포</h2>
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((g) => {
            const cnt = measurements.filter((m) => Number(m.total_grade) === g).length;
            const pct = measurements.length > 0 ? Math.round((cnt / measurements.length) * 100) : 0;
            return (
              <div
                key={g}
                className="flex-1 rounded-lg p-3 text-center text-white"
                style={{ backgroundColor: GRADE_COLORS[g] }}
              >
                <div className="text-lg font-bold">{g}등급</div>
                <div className="text-2xl font-black">{cnt}명</div>
                <div className="text-sm opacity-90">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 2페이지: 학생별 전체 결과 테이블 ─── */}
      <div
        id="report-page-2"
        className="bg-white p-8 print-break-before"
        style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
      >
        <div className="text-center mb-4 border-b pb-3">
          <h2 className="text-lg font-bold text-gray-800">
            {className || "전체"} 학생별 측정 결과
          </h2>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1.5 text-center">번호</th>
              <th className="border px-2 py-1.5 text-left">이름</th>
              <th className="border px-2 py-1.5 text-center">성별</th>
              <th className="border px-2 py-1.5 text-center">심폐</th>
              <th className="border px-2 py-1.5 text-center">근력</th>
              <th className="border px-2 py-1.5 text-center">유연</th>
              <th className="border px-2 py-1.5 text-center">순발</th>
              <th className="border px-2 py-1.5 text-center">BMI</th>
              <th className="border px-2 py-1.5 text-center font-bold">종합</th>
            </tr>
          </thead>
          <tbody>
            {measuredStudents.map(({ m, s }, idx) => (
              <tr key={m.student_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border px-2 py-1 text-center text-gray-500">{idx + 1}</td>
                <td className="border px-2 py-1 font-medium">{s.name}</td>
                <td className="border px-2 py-1 text-center text-gray-600">
                  {s.gender === "M" ? "남" : "여"}
                </td>
                <GradeCell grade={m.cardio_grade} />
                <GradeCell grade={m.muscle_grade} />
                <GradeCell grade={m.flexibility_grade} />
                <GradeCell grade={m.agility_grade} />
                <GradeCell grade={m.bmi_grade} />
                <td
                  className="border px-2 py-1 text-center font-bold"
                  style={{ color: m.total_grade ? GRADE_COLORS[m.total_grade] : "#9ca3af" }}
                >
                  {m.total_grade || "-"}
                </td>
              </tr>
            ))}
            {measuredStudents.length === 0 && (
              <tr>
                <td colSpan={9} className="border px-4 py-8 text-center text-gray-400">
                  측정 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
