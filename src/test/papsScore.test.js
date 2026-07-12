import { describe, it, expect } from 'vitest';
import { calcScore, calcBmiScore, calcTotalScore, totalGradeFromScore } from '../utils/papsScore';
import { buildGrades } from '../utils/gradeCalc';
import { GRADES_SEED_BY_LEVEL } from '../utils/gradesStandardSeed';

const ctx = { schoolLevel: '중학교', grade: 1, gender: 'M' };
const ctxF = { schoolLevel: '중학교', grade: 1, gender: 'F' };

describe('calcScore (기록→점수, 기록시트지 실측 재현)', () => {
  it('중1 남 셔틀런 — 시트 점수와 일치', () => {
    expect(calcScore(42, 'shuttle_run', ctx)).toBe(9);   // 권민준 42회 → 9점
    expect(calcScore(12, 'shuttle_run', ctx)).toBe(0);   // 김도후 12회 → 0점
    expect(calcScore(30, 'shuttle_run', ctx)).toBe(6);   // 안율 30회 → 6점
    expect(calcScore(73, 'shuttle_run', ctx)).toBe(20);  // 만점 경계
  });

  it('중1 여 셔틀런·중1 남 유연성(음수)', () => {
    expect(calcScore(21, 'shuttle_run', ctxF)).toBe(9);   // 김라임
    expect(calcScore(-8.7, 'sit_and_reach', ctx)).toBe(0); // 이로하 음수 기록
    expect(calcScore(6, 'sit_and_reach', ctx)).toBe(12);  // 권민준
  });

  it('악력·제자리멀리뛰기', () => {
    expect(calcScore(23.1, 'grip_strength', ctx)).toBe(8);   // 권민준
    expect(calcScore(200, 'standing_jump', ctx)).toBe(14);   // 권민준
    expect(calcScore(150, 'standing_jump', ctx)).toBe(6);    // 이로하
  });

  it('구간 틈새 값은 가장 가까운 구간으로 폴백 (50m 8.85초 → 8.8/8.9 사이)', () => {
    const s = calcScore(8.85, 'sprint_50m', ctx);
    expect([9, 10]).toContain(s);
  });

  it('값 없음·기준 없음이면 null', () => {
    expect(calcScore('', 'shuttle_run', ctx)).toBeNull();
    expect(calcScore(null, 'shuttle_run', ctx)).toBeNull();
    expect(calcScore(42, 'shuttle_run', { schoolLevel: '중학교', grade: 9, gender: 'M' })).toBeNull();
    expect(calcScore(42, 'shuttle_run', { schoolLevel: '없는학교급', grade: 1, gender: 'M' })).toBeNull();
  });
});

describe('calcBmiScore (BMI→점수, 비연속 구간)', () => {
  it('기록시트지 BMI 점수 재현', () => {
    expect(calcBmiScore(16.4, ctx)).toBe(10);  // 권민준 정상
    expect(calcBmiScore(25.8, ctx)).toBe(3);   // 김도후 경도비만
    expect(calcBmiScore(21.9, ctx)).toBe(12);  // 이로하 정상
    expect(calcBmiScore(22.5, ctx)).toBe(8);   // 안율 정상이지만 8점 — 등급과 점수는 별개
  });

  it('소수 둘째 자리 BMI도 반올림 후 조회 (구간 틈새 방지)', () => {
    expect(calcBmiScore(16.44, ctx)).toBe(10); // 16.4 구간
    expect(calcBmiScore(null, ctx)).toBeNull();
  });
});

describe('calcTotalScore·totalGradeFromScore (총점·종합등급)', () => {
  it('미측정 영역은 0점 처리, 전부 미측정이면 null', () => {
    expect(calcTotalScore([9, 12, 8, 14, 10])).toBe(53);
    expect(calcTotalScore([6, null, null, null, 8])).toBe(14); // 안율: 부분 측정
    expect(calcTotalScore([null, null, null, null, null])).toBeNull();
  });

  it('교육부 총점→등급 매핑', () => {
    expect(totalGradeFromScore(86)).toBe(1);
    expect(totalGradeFromScore(80)).toBe(1);
    expect(totalGradeFromScore(77)).toBe(2);
    expect(totalGradeFromScore(53)).toBe(3);
    expect(totalGradeFromScore(39)).toBe(4);
    expect(totalGradeFromScore(14)).toBe(5);
    expect(totalGradeFromScore(null)).toBeNull();
  });
});

describe('buildGrades — 공식 점수제 통합', () => {
  const gradesData = GRADES_SEED_BY_LEVEL['중학교'].map((r) => ({
    grade_level: r[0], gender: r[1], item: r[2],
    grade1_min: r[3], grade2_min: r[4], grade3_min: r[5], grade4_min: r[6], grade5_min: r[7],
    higher_is_better: r[8],
  }));
  const 권민준 = { grade: 1, gender: 'M', height: 152, weight: 37.8 };
  const form = {
    cardio_type: 'shuttle_run', cardio_value: 42,
    muscle_type: 'grip_strength', muscle_value: 23.1,
    flexibility_value: 6,
    agility_type: 'standing_jump', agility_value: 200,
  };

  it('기록시트지와 동일한 점수·총점·종합등급 (권민준: 총점 53 → 3등급)', () => {
    const g = buildGrades(form, 권민준, gradesData, { schoolLevel: '중학교' });
    expect(g.cardio_score).toBe(9);
    expect(g.flexibility_score).toBe(12);
    expect(g.muscle_score).toBe(8);
    expect(g.agility_score).toBe(14);
    expect(g.bmi_score).toBe(10);
    expect(g.total_score).toBe(53);
    expect(g.total_grade).toBe(3); // 기존 평균 방식이면 2등급 — 공식은 3등급
    // 영역 등급은 기존과 동일하게 유지
    expect(g.cardio_grade).toBe(3);
    expect(g.bmi_grade).toBe(1);
  });

  it('부분 측정: 미측정 종목 0점 반영 (안율: 셔틀런 30회만 → 총점 14 → 5등급)', () => {
    const 안율 = { grade: 1, gender: 'M', height: 171.3, weight: 65.9 };
    const g = buildGrades(
      { cardio_type: 'shuttle_run', cardio_value: 30, muscle_type: 'grip_strength', muscle_value: null, flexibility_value: null, agility_type: 'standing_jump', agility_value: null },
      안율, gradesData, { schoolLevel: '중학교' }
    );
    expect(g.cardio_score).toBe(6);
    expect(g.bmi_score).toBe(8);
    expect(g.total_score).toBe(14);
    expect(g.total_grade).toBe(5);
  });

  it('schoolLevel 미지정 시 기존 평균 방식 폴백 (점수 필드 없음)', () => {
    const g = buildGrades(form, 권민준, gradesData, {});
    expect(g.total_score).toBeUndefined();
    expect(g.total_grade).toBe(3); // 평균: 3,3,2,2 → BMI 등급 null(schoolLevel 없음) 제외 (3+3+2+2)/4=2.5 → 3
  });
});
