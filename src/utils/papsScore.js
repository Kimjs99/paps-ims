// PAPS 공식 점수제 — 기록→점수(0~20) 환산·총점(100점)·종합등급
// 기록시트지와 동일한 산출 방식: 4개 체력요인 점수 + BMI 점수 합산 → 총점 기준 종합등급
// 점수표: papsScoreTable.js (교육부 평가기준표 추출본). 테스트: src/test/papsScore.test.js

import { SCORE_TABLE_BY_LEVEL } from "./papsScoreTable";

// 기록값 → 점수 (0~20). 기준 없음/값 없음이면 null.
// 구간 틈새(측정 정밀도로 인한 미포함 값)는 가장 가까운 구간의 점수로 폴백.
export const calcScore = (value, item, { schoolLevel, grade, gender }) => {
  if (value === null || value === undefined || value === "") return null;
  const ranges = SCORE_TABLE_BY_LEVEL[schoolLevel]?.[`${grade}|${gender}|${item}`];
  if (!ranges) return null;
  const v = Number(value);
  if (Number.isNaN(v)) return null;
  for (const [score, lo, hi] of ranges) {
    if (v >= lo && v <= hi) return score;
  }
  let best = null;
  let bestDist = Infinity;
  for (const [score, lo, hi] of ranges) {
    const d = v < lo ? lo - v : v - hi;
    if (d < bestDist) {
      bestDist = d;
      best = score;
    }
  }
  return best;
};

// BMI → 점수 (0~20). 점수표는 소수 첫째 자리 구간 — 기록시트지와 동일하게 반올림 후 조회.
export const calcBmiScore = (bmi, ctx) =>
  bmi === null || bmi === undefined ? null : calcScore(Math.round(bmi * 10) / 10, "bmi", ctx);

// 영역 점수 합산 → 총점 (0~100). 미측정 영역은 공식 처리대로 0점.
// 전부 미측정(null)이면 null — 측정 전 학생에게 5등급을 매기지 않기 위함.
export const calcTotalScore = (scores) => {
  if (scores.every((s) => s === null || s === undefined)) return null;
  return scores.reduce((sum, s) => sum + (s ?? 0), 0);
};

// 저장된 측정 레코드 → 종목별 점수·총점 재계산 (표시용 — 점수는 시트에 저장하지 않음)
// grade는 측정 당시 학년(m.measured_grade) 우선, 없으면 호출부가 넘긴 현재 학년 사용
export const scoresForMeasurement = (m, { grade, gender, schoolLevel }) => {
  const ctx = { schoolLevel, grade: m.measured_grade ?? grade, gender };
  const cardio_score = calcScore(m.cardio_value, m.cardio_type, ctx);
  const muscle_score = calcScore(m.muscle_value, m.muscle_type, ctx);
  const flexibility_score = calcScore(m.flexibility_value, "sit_and_reach", ctx);
  const agility_score = calcScore(m.agility_value, m.agility_type, ctx);
  const bmi_score = calcBmiScore(m.bmi, ctx);
  const total_score = calcTotalScore([cardio_score, muscle_score, flexibility_score, agility_score, bmi_score]);
  return { cardio_score, muscle_score, flexibility_score, agility_score, bmi_score, total_score };
};

// 총점 → 종합등급 (교육부 기준: 80↑ 1등급 / 60↑ 2 / 40↑ 3 / 20↑ 4 / 미만 5)
export const totalGradeFromScore = (totalScore) => {
  if (totalScore === null || totalScore === undefined) return null;
  if (totalScore >= 80) return 1;
  if (totalScore >= 60) return 2;
  if (totalScore >= 40) return 3;
  if (totalScore >= 20) return 4;
  return 5;
};
