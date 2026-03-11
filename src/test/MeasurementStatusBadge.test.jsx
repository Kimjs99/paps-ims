import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MeasurementStatusBadge } from '../components/measurement/MeasurementStatusBadge';

describe('MeasurementStatusBadge', () => {
  it('status="incomplete"이면 "미측정" 표시', () => {
    render(<MeasurementStatusBadge status="incomplete" />);
    expect(screen.getByText('미측정')).toBeInTheDocument();
  });

  it('status="complete"이면 "완료" 표시', () => {
    render(<MeasurementStatusBadge status="complete" />);
    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('status="anomaly"이면 "이상값" 표시', () => {
    render(<MeasurementStatusBadge status="anomaly" />);
    expect(screen.getByText('이상값')).toBeInTheDocument();
  });

  it('status가 없으면 "미측정" 기본값 표시', () => {
    render(<MeasurementStatusBadge />);
    expect(screen.getByText('미측정')).toBeInTheDocument();
  });

  it('알 수 없는 status이면 "미측정" 기본값 표시', () => {
    render(<MeasurementStatusBadge status="unknown_status" />);
    expect(screen.getByText('미측정')).toBeInTheDocument();
  });

  it('status="incomplete"이면 회색 스타일 클래스 적용', () => {
    const { container } = render(<MeasurementStatusBadge status="incomplete" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('bg-gray-100');
    expect(span.className).toContain('text-gray-600');
  });

  it('status="complete"이면 초록 스타일 클래스 적용', () => {
    const { container } = render(<MeasurementStatusBadge status="complete" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('bg-green-100');
    expect(span.className).toContain('text-green-700');
  });

  it('status="anomaly"이면 빨간 스타일 클래스 적용', () => {
    const { container } = render(<MeasurementStatusBadge status="anomaly" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('bg-red-100');
    expect(span.className).toContain('text-red-700');
  });

  it('badge는 항상 span 요소로 렌더링됨', () => {
    const { container } = render(<MeasurementStatusBadge status="complete" />);
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('공통 스타일 클래스(inline-flex, rounded, text-xs)가 항상 적용됨', () => {
    const { container } = render(<MeasurementStatusBadge status="complete" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('inline-flex');
    expect(span.className).toContain('rounded');
    expect(span.className).toContain('text-xs');
  });
});
