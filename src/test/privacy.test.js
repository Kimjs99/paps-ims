import { describe, it, expect } from 'vitest';
import { maskName } from '../utils/privacy';

describe('maskName (학생 실명 마스킹)', () => {
  it('성만 남기고 * 처리 — 글자 수 유지', () => {
    expect(maskName('김민준')).toBe('김**');
    expect(maskName('이수')).toBe('이*');
    expect(maskName('남궁민수')).toBe('남***');
  });

  it('1글자·빈 값·null은 그대로', () => {
    expect(maskName('김')).toBe('김');
    expect(maskName('')).toBe('');
    expect(maskName(null)).toBe('');
    expect(maskName(undefined)).toBe('');
  });

  it('앞뒤 공백 제거 후 마스킹', () => {
    expect(maskName(' 김민준 ')).toBe('김**');
  });
});
