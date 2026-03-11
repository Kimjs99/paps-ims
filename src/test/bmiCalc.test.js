import { describe, it, expect } from 'vitest';
import { calcBMI, calcBMIGrade } from '../utils/bmiCalc';

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

describe('calcBMIGrade', () => {
  it('BMI 18.5 미만 → 4등급 (저체중)', () => {
    expect(calcBMIGrade(16)).toBe(4);
    expect(calcBMIGrade(18.4)).toBe(4);
  });

  it('BMI 18.5 이상 23 미만 → 1등급 (정상)', () => {
    expect(calcBMIGrade(18.5)).toBe(1);
    expect(calcBMIGrade(22)).toBe(1);
    expect(calcBMIGrade(22.9)).toBe(1);
  });

  it('BMI 23 이상 25 미만 → 2등급 (과체중)', () => {
    expect(calcBMIGrade(23)).toBe(2);
    expect(calcBMIGrade(24.9)).toBe(2);
  });

  it('BMI 25 이상 30 미만 → 3등급 (비만)', () => {
    expect(calcBMIGrade(25)).toBe(3);
    expect(calcBMIGrade(29.9)).toBe(3);
  });

  it('BMI 30 이상 → 5등급 (고도비만)', () => {
    expect(calcBMIGrade(30)).toBe(5);
    expect(calcBMIGrade(40)).toBe(5);
  });

  it('null 입력 → null 반환', () => {
    expect(calcBMIGrade(null)).toBeNull();
  });

  it('undefined 입력 → null 반환', () => {
    expect(calcBMIGrade(undefined)).toBeNull();
  });

  it('경계값 23 → 2등급', () => {
    expect(calcBMIGrade(23)).toBe(2);
  });

  it('경계값 25 → 3등급', () => {
    expect(calcBMIGrade(25)).toBe(3);
  });

  it('경계값 30 → 5등급', () => {
    expect(calcBMIGrade(30)).toBe(5);
  });
});
