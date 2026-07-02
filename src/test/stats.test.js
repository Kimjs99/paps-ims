import { describe, it, expect } from 'vitest';
import { avgOf, avgFixed1, avgRounded } from '../utils/stats';

describe('avgOf (반올림 없는 산술 평균)', () => {
  it('평균값 그대로 반환 (반올림 없음)', () => {
    expect(avgOf([1, 2])).toBe(1.5);
    expect(avgOf([1, 1, 2])).toBeCloseTo(1.3333333, 5);
  });

  it('단일 값이면 그 값 반환', () => {
    expect(avgOf([4])).toBe(4);
  });

  it('빈 배열이면 null 반환', () => {
    expect(avgOf([])).toBeNull();
  });

  it('음수 포함 평균 (유연성 측정값 등)', () => {
    expect(avgOf([-4, 4])).toBe(0);
  });
});

describe('avgFixed1 (소수점 1자리 반올림 숫자)', () => {
  it('parseFloat(toFixed(1))과 동일한 결과', () => {
    // 1.3333... → "1.3" → 1.3
    expect(avgFixed1([1, 1, 2])).toBe(1.3);
    // 2.55 → toFixed(1) 뱅커스 아닌 문자열 반올림 규칙 그대로
    expect(avgFixed1([2.5, 2.6])).toBe(parseFloat(((2.5 + 2.6) / 2).toFixed(1)));
  });

  it('정수 평균은 정수 숫자 반환 (parseFloat이 후행 0 제거)', () => {
    expect(avgFixed1([2, 4])).toBe(3);
  });

  it('빈 배열이면 null 반환', () => {
    expect(avgFixed1([])).toBeNull();
  });
});

describe('avgRounded (정수 반올림 평균 — total_grade 재계산 규칙)', () => {
  it('Math.round(평균)과 동일', () => {
    expect(avgRounded([1, 2])).toBe(2); // 1.5 → 2
    expect(avgRounded([1, 1, 2])).toBe(1); // 1.33 → 1
    expect(avgRounded([1, 2, 3, 4, 5])).toBe(3);
  });

  it('빈 배열이면 null 반환', () => {
    expect(avgRounded([])).toBeNull();
  });
});
