import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn (class name utility)', () => {
  it('단일 클래스 그대로 반환', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('여러 클래스 병합', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('조건부 클래스: true이면 포함', () => {
    const condition = true;
    expect(cn('base', condition && 'included')).toBe('base included');
  });

  it('조건부 클래스: false이면 제외', () => {
    const condition = false;
    expect(cn('base', condition && 'excluded')).toBe('base');
  });

  it('Tailwind 충돌 클래스 병합: 나중 클래스 우선', () => {
    // twMerge가 p-2와 p-4 충돌 시 p-4 우선
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('text 충돌: 나중 것 우선', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('undefined/null 인자 무시', () => {
    expect(cn('flex', undefined, null, 'gap-2')).toBe('flex gap-2');
  });

  it('빈 문자열 인자 무시', () => {
    expect(cn('flex', '', 'gap-2')).toBe('flex gap-2');
  });

  it('인자 없으면 빈 문자열 반환', () => {
    expect(cn()).toBe('');
  });

  it('객체 형태 clsx 조건: true 키는 포함', () => {
    expect(cn({ 'font-bold': true, 'font-normal': false })).toBe('font-bold');
  });

  it('배열 형태 인자도 처리', () => {
    expect(cn(['flex', 'items-center'])).toBe('flex items-center');
  });
});
