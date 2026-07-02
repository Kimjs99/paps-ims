// 보고서 데이터 파이프라인 순수 함수 — Report.jsx에서 분리
// 계약(CLAUDE.md): 보고서는 "최우수 병합이 아닌 평균값" 기반 —
// deduplicateMeasurements()를 여기서 절대 사용하지 말 것 (최우수 병합으로 데이터 왜곡).
// 테스트: src/test/reportData.test.js

import { FITNESS_GRADE_FIELDS } from "../../constants/paps";
import { avgRounded } from "../../utils/stats";

const REPORT_GRADE_KEYS = FITNESS_GRADE_FIELDS;

// 측정 목록에 year/학년/반 필터 적용 (학년·반 매칭은 activeStudents 기준 — 미매칭 학생 측정은 제외)
export const filterMeasurements = (list, activeStudents, { filterYear, filterGrade, filterClass }) => {
  let m = list;
  if (filterYear) m = m.filter((x) => String(x.year) === filterYear);
  if (filterGrade || filterClass) {
    m = m.filter((x) => {
      const s = activeStudents.find((st) => st.student_id === x.student_id);
      if (!s) return false;
      if (filterGrade && String(s.grade) !== filterGrade) return false;
      if (filterClass && String(s.class) !== filterClass) return false;
      return true;
    });
  }
  return m;
};

// 보고서용: 원시 측정값에서 학생별 평균 등급 산출 (최우수 병합 없음)
export const buildReportMeasurements = (measurements, activeStudents, filters) => {
  // 활성 학생 필터 무조건 선행 — 학년/반 무필터 시에도 비활성 학생 제외 (v0.12.1)
  const activeIds = new Set(activeStudents.map((s) => s.student_id));
  const raw = filterMeasurements(
    measurements.filter((m) => activeIds.has(m.student_id)),
    activeStudents,
    filters
  );
  const groups = new Map();
  raw.forEach((m) => {
    if (!groups.has(m.student_id)) groups.set(m.student_id, []);
    groups.get(m.student_id).push(m);
  });
  return Array.from(groups.entries()).map(([student_id, records]) => {
    const result = { student_id };
    REPORT_GRADE_KEYS.forEach((key) => {
      result[key] = avgRounded(records.map((r) => Number(r[key])).filter((v) => v >= 1 && v <= 5));
    });
    result.total_grade = avgRounded(
      records.map((r) => Number(r.total_grade)).filter((v) => v >= 1 && v <= 5)
    );
    return result;
  });
};

// 사용 가능한 연도 목록 (최신순)
export const getAvailableYears = (measurements) => {
  const years = [...new Set(measurements.map((m) => m.year).filter(Boolean))];
  return years.sort((a, b) => b - a);
};

// 반 목록 (학년 필터 반영, 오름차순)
export const getAvailableClasses = (activeStudents, filterGrade) => {
  let s = activeStudents;
  if (filterGrade) s = s.filter((st) => String(st.grade) === filterGrade);
  const classes = [...new Set(s.map((st) => st.class).filter(Boolean))];
  return classes.sort((a, b) => Number(a) - Number(b));
};

// 필터 적용된 학생 목록
export const filterStudents = (activeStudents, { filterGrade, filterClass }) => {
  let s = activeStudents;
  if (filterGrade) s = s.filter((st) => String(st.grade) === filterGrade);
  if (filterClass) s = s.filter((st) => String(st.class) === filterClass);
  return s;
};

// 필터 조합 레이블 (예: "1학년 2반 2026년도", 무필터 시 "전체")
export const buildClassLabel = ({ filterGrade, filterClass, filterYear }) => {
  const parts = [];
  if (filterGrade) parts.push(`${filterGrade}학년`);
  if (filterClass) parts.push(`${filterClass}반`);
  if (filterYear) parts.push(`${filterYear}년도`);
  return parts.length > 0 ? parts.join(" ") : "전체";
};
