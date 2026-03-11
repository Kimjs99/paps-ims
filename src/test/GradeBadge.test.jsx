import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GradeBadge } from '../components/ui/GradeBadge';

describe('GradeBadge', () => {
  it('grade prop이 없으면 "-" 텍스트 표시', () => {
    render(<GradeBadge />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('grade prop이 0(falsy)이면 "-" 표시', () => {
    render(<GradeBadge grade={0} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('grade prop이 null이면 "-" 표시', () => {
    render(<GradeBadge grade={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('grade=1이면 "1등급" 텍스트 표시', () => {
    render(<GradeBadge grade={1} />);
    expect(screen.getByText('1등급')).toBeInTheDocument();
  });

  it('grade=2이면 "2등급" 텍스트 표시', () => {
    render(<GradeBadge grade={2} />);
    expect(screen.getByText('2등급')).toBeInTheDocument();
  });

  it('grade=3이면 "3등급" 텍스트 표시', () => {
    render(<GradeBadge grade={3} />);
    expect(screen.getByText('3등급')).toBeInTheDocument();
  });

  it('grade=4이면 "4등급" 텍스트 표시', () => {
    render(<GradeBadge grade={4} />);
    expect(screen.getByText('4등급')).toBeInTheDocument();
  });

  it('grade=5이면 "5등급" 텍스트 표시', () => {
    render(<GradeBadge grade={5} />);
    expect(screen.getByText('5등급')).toBeInTheDocument();
  });

  it('showLabel=true이면 등급 레이블도 함께 표시', () => {
    render(<GradeBadge grade={1} showLabel={true} />);
    expect(screen.getByText('1등급 · 최우수')).toBeInTheDocument();
  });

  it('showLabel=true, grade=2이면 "2등급 · 우수" 표시', () => {
    render(<GradeBadge grade={2} showLabel={true} />);
    expect(screen.getByText('2등급 · 우수')).toBeInTheDocument();
  });

  it('showLabel=true, grade=3이면 "3등급 · 보통" 표시', () => {
    render(<GradeBadge grade={3} showLabel={true} />);
    expect(screen.getByText('3등급 · 보통')).toBeInTheDocument();
  });

  it('showLabel=true, grade=4이면 "4등급 · 노력 필요" 표시', () => {
    render(<GradeBadge grade={4} showLabel={true} />);
    expect(screen.getByText('4등급 · 노력 필요')).toBeInTheDocument();
  });

  it('showLabel=true, grade=5이면 "5등급 · 매우 노력 필요" 표시', () => {
    render(<GradeBadge grade={5} showLabel={true} />);
    expect(screen.getByText('5등급 · 매우 노력 필요')).toBeInTheDocument();
  });

  it('size="sm"이면 기본 소형 클래스 적용', () => {
    const { container } = render(<GradeBadge grade={1} size="sm" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('px-2');
    expect(span.className).toContain('text-xs');
  });

  it('size="lg"이면 대형 클래스 적용', () => {
    const { container } = render(<GradeBadge grade={1} size="lg" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('px-3');
    expect(span.className).toContain('text-sm');
  });

  it('grade=1이면 배경색이 GRADE_COLORS[1] (#2563EB)', () => {
    const { container } = render(<GradeBadge grade={1} />);
    const span = container.querySelector('span');
    expect(span.style.backgroundColor).toBe('rgb(37, 99, 235)');
  });

  it('grade=5이면 배경색이 GRADE_COLORS[5] (#DC2626)', () => {
    const { container } = render(<GradeBadge grade={5} />);
    const span = container.querySelector('span');
    expect(span.style.backgroundColor).toBe('rgb(220, 38, 38)');
  });
});
