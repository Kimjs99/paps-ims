// StudentDetail 데이터 셰이핑 순수 함수 + 표기 상수 — 페이지/테이블/카드에서 공용
// 컴포넌트 파일(StudentDetail.jsx)에서 분리: 단위 테스트 용이. 테스트: src/test/studentDetailData.test.js

import { CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES, FITNESS_AREAS } from "../../constants/paps";
import { avgFixed1 } from "../../utils/stats";

export const getTypeInfo = (types, typeValue) => {
  const t = types.find((t) => t.value === typeValue);
  return t ?? { label: typeValue ?? "—", unit: "" };
};

// KST 측정일시 표기 (예: "2024-03-12 10:00")
export const formatDatetime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return v.slice(0, 16).replace("T", " ");
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 16);
};

// 추이 토글: 종합 + 5개 영역 (bmi는 "비만" 표기)
export const AREA_KEYS = ["total", ...FITNESS_AREAS.map((a) => a.key)];
export const AREA_LABELS = {
  total: "종합",
  ...Object.fromEntries(FITNESS_AREAS.map((a) => [a.key, a.labelAlt ?? a.label])),
};

// 평균 카드·레이더: bmi는 "비만(BMI)" 표기
export const AREA_ITEMS = FITNESS_AREAS.map((a) => ({ label: a.labelFull ?? a.label, key: a.gradeField }));

// 해당 학생의 전체 원본 측정 이력 (최신순)
export const selectRawMeasurements = (measurements, studentId) =>
  measurements
    .filter((m) => m.student_id === studentId)
    .sort((a, b) => (b.measured_at ?? b.year) > (a.measured_at ?? a.year) ? 1 : -1);

// 측정 연도 목록 (최신순)
export const getAvailableYears = (rawMeasurements) => {
  const years = [...new Set(rawMeasurements.map((m) => m.year).filter(Boolean))];
  return years.sort((a, b) => b - a);
};

// 추이 차트용: 선택 연도의 측정 기록 (시간순 오름차순)
export const selectTrendMeasurements = (rawMeasurements, activeYear) => {
  if (!activeYear) return [];
  return [...rawMeasurements]
    .filter((m) => String(m.year) === String(activeYear))
    .sort((a, b) => (a.measured_at ?? "") < (b.measured_at ?? "") ? -1 : 1);
};

// 추이 차트 데이터 (X축: 측정일자)
export const buildTrendData = (trendMeasurements) =>
  trendMeasurements.map((m) => ({
    label: m.measured_at?.slice(0, 10) ?? String(m.year),
    total: m.total_grade != null ? Number(m.total_grade) : null,
    cardio: m.cardio_grade != null ? Number(m.cardio_grade) : null,
    muscle: m.muscle_grade != null ? Number(m.muscle_grade) : null,
    flexibility: m.flexibility_grade != null ? Number(m.flexibility_grade) : null,
    agility: m.agility_grade != null ? Number(m.agility_grade) : null,
    bmi: m.bmi_grade != null ? Number(m.bmi_grade) : null,
  }));

// 전체 기간 영역별 평균 등급 + 평균 측정값 (레이더 + 평균 카드 + 테이블 평균 행용)
export const buildAvgRecord = (rawMeasurements) => {
  if (!rawMeasurements.length) return null;
  const keys = [
    "cardio_grade", "muscle_grade", "flexibility_grade", "agility_grade", "bmi_grade", "total_grade",
    "cardio_value", "muscle_value", "flexibility_value", "agility_value", "bmi",
  ];
  const result = {};
  keys.forEach((key) => {
    const vals = rawMeasurements
      .map((m) => m[key])
      .filter((v) => v != null && !isNaN(Number(v)))
      .map(Number);
    result[key] = avgFixed1(vals);
  });
  return result;
};
