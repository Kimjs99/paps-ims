import { describe, it, expect } from 'vitest';
import { calcGrade, calcTotalGrade, buildGrades } from '../utils/gradeCalc';

// higher_is_better = true 기준 mock: 값이 클수록 좋음 (예: 왕복오래달리기)
const makeStandard = (overrides = {}) => ({
  grade_level: 1,
  gender: 'M',
  item: 'shuttle_run',
  higher_is_better: true,
  grade1_min: 80,
  grade2_min: 60,
  grade3_min: 40,
  grade4_min: 20,
  grade5_min: 0,
  ...overrides,
});

// higher_is_better = false 기준 mock: 값이 작을수록 좋음 (예: 50m 달리기)
const makeStandardLower = (overrides = {}) => ({
  grade_level: 1,
  gender: 'M',
  item: 'sprint_50m',
  higher_is_better: false,
  grade1_min: 7.0,
  grade2_min: 7.5,
  grade3_min: 8.5,
  grade4_min: 10.0,
  grade5_min: 99,
  ...overrides,
});

describe('calcGrade - higher_is_better=true (값이 클수록 좋음)', () => {
  const gradesData = [makeStandard()];

  it('값이 grade1_min 이상 → 1등급', () => {
    expect(calcGrade(80, 'shuttle_run', 1, 'M', gradesData)).toBe(1);
    expect(calcGrade(100, 'shuttle_run', 1, 'M', gradesData)).toBe(1);
  });

  it('값이 grade2_min 이상 grade1_min 미만 → 2등급', () => {
    expect(calcGrade(60, 'shuttle_run', 1, 'M', gradesData)).toBe(2);
    expect(calcGrade(79, 'shuttle_run', 1, 'M', gradesData)).toBe(2);
  });

  it('값이 grade3_min 이상 grade2_min 미만 → 3등급', () => {
    expect(calcGrade(40, 'shuttle_run', 1, 'M', gradesData)).toBe(3);
    expect(calcGrade(59, 'shuttle_run', 1, 'M', gradesData)).toBe(3);
  });

  it('값이 grade4_min 이상 grade3_min 미만 → 4등급', () => {
    expect(calcGrade(20, 'shuttle_run', 1, 'M', gradesData)).toBe(4);
    expect(calcGrade(39, 'shuttle_run', 1, 'M', gradesData)).toBe(4);
  });

  it('값이 grade4_min 미만 → 5등급', () => {
    expect(calcGrade(0, 'shuttle_run', 1, 'M', gradesData)).toBe(5);
    expect(calcGrade(19, 'shuttle_run', 1, 'M', gradesData)).toBe(5);
  });
});

describe('calcGrade - higher_is_better=false (값이 작을수록 좋음)', () => {
  const gradesData = [makeStandardLower()];

  it('값이 grade1_min 이하 → 1등급', () => {
    expect(calcGrade(7.0, 'sprint_50m', 1, 'M', gradesData)).toBe(1);
    expect(calcGrade(6.5, 'sprint_50m', 1, 'M', gradesData)).toBe(1);
  });

  it('값이 grade1_min 초과 grade2_min 이하 → 2등급', () => {
    expect(calcGrade(7.5, 'sprint_50m', 1, 'M', gradesData)).toBe(2);
  });

  it('값이 grade2_min 초과 grade3_min 이하 → 3등급', () => {
    expect(calcGrade(8.5, 'sprint_50m', 1, 'M', gradesData)).toBe(3);
  });

  it('값이 grade3_min 초과 grade4_min 이하 → 4등급', () => {
    expect(calcGrade(10.0, 'sprint_50m', 1, 'M', gradesData)).toBe(4);
  });

  it('값이 grade4_min 초과 → 5등급', () => {
    expect(calcGrade(12.0, 'sprint_50m', 1, 'M', gradesData)).toBe(5);
  });
});

describe('calcGrade - 유효하지 않은 입력', () => {
  const gradesData = [makeStandard()];

  it('value가 null이면 null 반환', () => {
    expect(calcGrade(null, 'shuttle_run', 1, 'M', gradesData)).toBeNull();
  });

  it('value가 undefined이면 null 반환', () => {
    expect(calcGrade(undefined, 'shuttle_run', 1, 'M', gradesData)).toBeNull();
  });

  it('value가 빈 문자열이면 null 반환', () => {
    expect(calcGrade('', 'shuttle_run', 1, 'M', gradesData)).toBeNull();
  });

  it('해당 기준 없으면 null 반환', () => {
    expect(calcGrade(50, 'nonexistent_item', 1, 'M', gradesData)).toBeNull();
  });

  it('학년 불일치 시 null 반환', () => {
    expect(calcGrade(50, 'shuttle_run', 2, 'M', gradesData)).toBeNull();
  });

  it('성별 불일치 시 null 반환', () => {
    expect(calcGrade(50, 'shuttle_run', 1, 'F', gradesData)).toBeNull();
  });
});

describe('calcTotalGrade', () => {
  it('전체 등급이 있으면 평균 반올림 반환', () => {
    expect(calcTotalGrade([1, 2, 3, 4, 5])).toBe(3);
  });

  it('동일한 등급만 있으면 그 등급 반환', () => {
    expect(calcTotalGrade([1, 1, 1])).toBe(1);
  });

  it('null/undefined는 제외하고 평균 계산', () => {
    expect(calcTotalGrade([1, null, 3, undefined, 5])).toBe(3);
  });

  it('모두 null/undefined이면 null 반환', () => {
    expect(calcTotalGrade([null, undefined, null])).toBeNull();
  });

  it('빈 배열이면 null 반환', () => {
    expect(calcTotalGrade([])).toBeNull();
  });

  it('반올림 처리: [1, 2] → 2', () => {
    // (1+2)/2 = 1.5 → round → 2
    expect(calcTotalGrade([1, 2])).toBe(2);
  });

  it('반올림 처리: [1, 1, 2] → 1', () => {
    // (1+1+2)/3 = 1.33... → round → 1
    expect(calcTotalGrade([1, 1, 2])).toBe(1);
  });
});

describe('buildGrades', () => {
  const gradesData = [
    makeStandard({ item: 'shuttle_run', grade1_min: 80, grade2_min: 60, grade3_min: 40, grade4_min: 20 }),
    makeStandard({ item: 'sit_up', grade1_min: 50, grade2_min: 40, grade3_min: 30, grade4_min: 20 }),
    makeStandard({ item: 'sit_and_reach', grade1_min: 15, grade2_min: 10, grade3_min: 5, grade4_min: 0 }),
    makeStandard({ item: 'sprint_50m', higher_is_better: false, grade1_min: 7.0, grade2_min: 7.5, grade3_min: 8.5, grade4_min: 10.0 }),
  ];

  const student = {
    height: 170,
    weight: 65,
    grade: 1,
    gender: 'M',
  };

  const formValues = {
    cardio_type: 'shuttle_run',
    cardio_value: 85,
    muscle_type: 'sit_up',
    muscle_value: 55,
    flexibility_value: 20,
    agility_type: 'sprint_50m',
    agility_value: 6.5,
  };

  it('완전한 측정값으로 buildGrades 호출 시 bmi와 등급 객체 반환', () => {
    const result = buildGrades(formValues, student, gradesData);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('bmi');
    expect(result).toHaveProperty('bmi_grade');
    expect(result).toHaveProperty('cardio_grade');
    expect(result).toHaveProperty('muscle_grade');
    expect(result).toHaveProperty('flexibility_grade');
    expect(result).toHaveProperty('agility_grade');
    expect(result).toHaveProperty('total_grade');
  });

  it('cardio_value=85(1등급)이면 cardio_grade=1', () => {
    const result = buildGrades(formValues, student, gradesData);
    expect(result.cardio_grade).toBe(1);
  });

  it('student가 null이면 null 반환', () => {
    expect(buildGrades(formValues, null, gradesData)).toBeNull();
  });

  it('gradesData가 null이면 null 반환', () => {
    expect(buildGrades(formValues, student, null)).toBeNull();
  });
});
