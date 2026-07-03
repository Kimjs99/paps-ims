import { describe, it, expect } from 'vitest';
import { calcBMI, calcBMIGrade, BMI_STANDARDS_BY_LEVEL } from '../utils/bmiCalc';

describe('calcBMI', () => {
  it('정상 값: 170cm, 65kg → BMI 22.5', () => {
    expect(calcBMI(170, 65)).toBe(22.5);
  });

  it('정상 값: 160cm, 50kg → BMI 19.5', () => {
    expect(calcBMI(160, 50)).toBe(19.5);
  });

  it('소수점 반올림: 180cm, 75kg → 소수 첫째 자리', () => {
    const result = calcBMI(180, 75);
    expect(result).toBe(23.1);
  });

  it('height가 0이면 null 반환', () => {
    expect(calcBMI(0, 65)).toBeNull();
  });

  it('weight가 0이면 null 반환', () => {
    expect(calcBMI(170, 0)).toBeNull();
  });

  it('height가 null이면 null 반환', () => {
    expect(calcBMI(null, 65)).toBeNull();
  });

  it('weight가 null이면 null 반환', () => {
    expect(calcBMI(170, null)).toBeNull();
  });

  it('둘 다 null이면 null 반환', () => {
    expect(calcBMI(null, null)).toBeNull();
  });

  it('undefined 인자도 null 반환', () => {
    expect(calcBMI(undefined, 65)).toBeNull();
  });
});

describe('calcBMIGrade (PAPS 공식 학년·성별 기준)', () => {
  const 중1남 = { schoolLevel: '중학교', grade: 1, gender: 'M' };

  it('중1 남 경계값: 마름≤15.3 / 정상~23.2 / 과체중~24.9 / 경도비만~29.9 / 고도비만≥30.0', () => {
    expect(calcBMIGrade(15.3, 중1남)).toBe(4); // 마름
    expect(calcBMIGrade(15.4, 중1남)).toBe(1); // 정상 하한
    expect(calcBMIGrade(23.2, 중1남)).toBe(1); // 정상 상한
    expect(calcBMIGrade(23.3, 중1남)).toBe(2); // 과체중 하한
    expect(calcBMIGrade(24.9, 중1남)).toBe(2); // 과체중 상한
    expect(calcBMIGrade(25.0, 중1남)).toBe(3); // 경도비만 하한
    expect(calcBMIGrade(29.9, 중1남)).toBe(3); // 경도비만 상한
    expect(calcBMIGrade(30.0, 중1남)).toBe(5); // 고도비만
  });

  it('초4 여 경계값: 마름≤13.9 / 정상~19.8 / 과체중~22.0 / 경도비만~29.9', () => {
    const ctx = { schoolLevel: '초등학교', grade: 4, gender: 'F' };
    expect(calcBMIGrade(13.9, ctx)).toBe(4);
    expect(calcBMIGrade(14.0, ctx)).toBe(1);
    expect(calcBMIGrade(19.8, ctx)).toBe(1);
    expect(calcBMIGrade(19.9, ctx)).toBe(2);
    expect(calcBMIGrade(22.0, ctx)).toBe(2);
    expect(calcBMIGrade(22.1, ctx)).toBe(3);
    expect(calcBMIGrade(30.0, ctx)).toBe(5);
  });

  it('고2·고3 남은 과체중 구간 없음 — 25.0~29.9 전체가 경도비만', () => {
    const 고2남 = { schoolLevel: '고등학교', grade: 2, gender: 'M' };
    expect(calcBMIGrade(24.9, 고2남)).toBe(1); // 정상 상한
    expect(calcBMIGrade(25.0, 고2남)).toBe(3); // 과체중 건너뛰고 경도비만
    const 고3남 = { schoolLevel: '고등학교', grade: 3, gender: 'M' };
    expect(calcBMIGrade(24.9, 고3남)).toBe(1);
    expect(calcBMIGrade(25.0, 고3남)).toBe(3);
  });

  it('고3 여: 정상~23.9 / 과체중 24.0~24.9 구간 존재', () => {
    const 고3여 = { schoolLevel: '고등학교', grade: 3, gender: 'F' };
    expect(calcBMIGrade(23.9, 고3여)).toBe(1);
    expect(calcBMIGrade(24.0, 고3여)).toBe(2);
    expect(calcBMIGrade(24.9, 고3여)).toBe(2);
    expect(calcBMIGrade(25.0, 고3여)).toBe(3);
  });

  it('초3은 공식 기준 미제공 → null (등급 미산출)', () => {
    expect(calcBMIGrade(20, { schoolLevel: '초등학교', grade: 3, gender: 'M' })).toBeNull();
    expect(calcBMIGrade(20, { schoolLevel: '초등학교', grade: 3, gender: 'F' })).toBeNull();
  });

  it('학교급/학년/성별 정보 부족 시 null', () => {
    expect(calcBMIGrade(22)).toBeNull(); // ctx 미지정
    expect(calcBMIGrade(22, {})).toBeNull();
    expect(calcBMIGrade(22, { schoolLevel: '중학교', grade: 1 })).toBeNull(); // gender 없음
    expect(calcBMIGrade(22, { schoolLevel: '대학교', grade: 1, gender: 'M' })).toBeNull();
  });

  it('null/undefined BMI → null 반환', () => {
    expect(calcBMIGrade(null, 중1남)).toBeNull();
    expect(calcBMIGrade(undefined, 중1남)).toBeNull();
  });

  it('기준표 무결성: 모든 항목이 [마름<정상≤과체중<경도비만=29.9] 순서', () => {
    Object.values(BMI_STANDARDS_BY_LEVEL).forEach((byGender) => {
      Object.values(byGender).forEach((byGrade) => {
        Object.values(byGrade).forEach(([underMax, normalMax, overMax, mildMax]) => {
          expect(underMax).toBeLessThan(normalMax);
          expect(normalMax).toBeLessThanOrEqual(overMax); // 남 고2·고3은 동일(과체중 없음)
          expect(overMax).toBeLessThan(mildMax);
          expect(mildMax).toBe(29.9);
        });
      });
    });
  });

  it('기준표 커버리지: 초4~6·중1~3·고1~3 × 남녀 = 18항목', () => {
    const count = Object.values(BMI_STANDARDS_BY_LEVEL)
      .flatMap((byGender) => Object.values(byGender))
      .reduce((acc, byGrade) => acc + Object.keys(byGrade).length, 0);
    expect(count).toBe(18);
  });
});
