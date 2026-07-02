import { describe, it, expect } from 'vitest';
import {
  getTypeInfo, formatDatetime,
  AREA_KEYS, AREA_LABELS, AREA_ITEMS,
  selectRawMeasurements, getAvailableYears, selectTrendMeasurements,
  buildTrendData, buildAvgRecord,
} from '../pages/dashboard/studentDetailData';
import { CARDIO_TYPES } from '../constants/paps';

describe('getTypeInfo (종목 라벨/단위 조회)', () => {
  it('알려진 종목이면 라벨·단위 반환', () => {
    expect(getTypeInfo(CARDIO_TYPES, 'shuttle_run')).toEqual(
      { value: 'shuttle_run', label: '왕복오래달리기', unit: '회' }
    );
  });

  it('알 수 없는 종목이면 raw 값 + 빈 단위', () => {
    expect(getTypeInfo(CARDIO_TYPES, 'mystery')).toEqual({ label: 'mystery', unit: '' });
  });

  it('null/undefined면 "—" 표기', () => {
    expect(getTypeInfo(CARDIO_TYPES, null)).toEqual({ label: '—', unit: '' });
  });
});

describe('formatDatetime (KST 측정일시 표기)', () => {
  it('ISO 문자열 → KST "YYYY-MM-DD HH:mm"', () => {
    // UTC 01:00 → KST 10:00
    expect(formatDatetime('2024-03-12T01:00:00Z')).toBe('2024-03-12 10:00');
  });

  it('빈 값이면 "—"', () => {
    expect(formatDatetime(null)).toBe('—');
    expect(formatDatetime('')).toBe('—');
  });

  it('파싱 불가 문자열이면 앞 16자 + T→공백 폴백', () => {
    expect(formatDatetime('not-a-dateTvalue-x')).toBe('not-a-date value');
  });
});

describe('표기 상수 (FITNESS_AREAS 파생)', () => {
  it('AREA_KEYS: 종합 + 5개 영역', () => {
    expect(AREA_KEYS).toEqual(['total', 'cardio', 'muscle', 'flexibility', 'agility', 'bmi']);
  });

  it('AREA_LABELS: bmi는 "비만" 표기', () => {
    expect(AREA_LABELS.total).toBe('종합');
    expect(AREA_LABELS.bmi).toBe('비만');
  });

  it('AREA_ITEMS: bmi는 "비만(BMI)" 표기 + gradeField 키', () => {
    expect(AREA_ITEMS).toContainEqual({ label: '비만(BMI)', key: 'bmi_grade' });
    expect(AREA_ITEMS).toHaveLength(5);
  });
});

const measurements = [
  { measurement_id: 'a', student_id: 's1', year: 2025, measured_at: '2025-04-01T01:00:00Z', total_grade: 2, cardio_grade: 1, cardio_value: 80, bmi: 20 },
  { measurement_id: 'b', student_id: 's1', year: 2026, measured_at: '2026-05-02T01:00:00Z', total_grade: 3, cardio_grade: 3, cardio_value: 60, bmi: 21 },
  { measurement_id: 'c', student_id: 's1', year: 2026, measured_at: '2026-03-01T01:00:00Z', total_grade: 1, cardio_grade: 2, cardio_value: 70, bmi: 22 },
  { measurement_id: 'd', student_id: 's2', year: 2026, measured_at: '2026-05-03T01:00:00Z', total_grade: 5 },
];

describe('selectRawMeasurements (학생 이력 추출·최신순)', () => {
  it('해당 학생만 필터 + measured_at 내림차순', () => {
    const raw = selectRawMeasurements(measurements, 's1');
    expect(raw.map((m) => m.measurement_id)).toEqual(['b', 'c', 'a']);
  });

  it('이력 없는 학생이면 빈 배열', () => {
    expect(selectRawMeasurements(measurements, 'none')).toEqual([]);
  });
});

describe('getAvailableYears (측정 연도 목록·최신순)', () => {
  it('중복 제거 + 내림차순', () => {
    const raw = selectRawMeasurements(measurements, 's1');
    expect(getAvailableYears(raw)).toEqual([2026, 2025]);
  });

  it('falsy 연도 제외', () => {
    expect(getAvailableYears([{ year: null }, { year: 2025 }])).toEqual([2025]);
  });
});

describe('selectTrendMeasurements (선택 연도·시간순 오름차순)', () => {
  it('연도 필터 + measured_at 오름차순', () => {
    const raw = selectRawMeasurements(measurements, 's1');
    const trend = selectTrendMeasurements(raw, 2026);
    expect(trend.map((m) => m.measurement_id)).toEqual(['c', 'b']);
  });

  it('연도 타입이 달라도(String 비교) 매칭', () => {
    const raw = selectRawMeasurements(measurements, 's1');
    expect(selectTrendMeasurements(raw, '2026')).toHaveLength(2);
  });

  it('activeYear가 null이면 빈 배열', () => {
    expect(selectTrendMeasurements(measurements, null)).toEqual([]);
  });

  it('원본 배열을 변형하지 않음 (복사 후 정렬)', () => {
    const raw = selectRawMeasurements(measurements, 's1');
    const before = raw.map((m) => m.measurement_id);
    selectTrendMeasurements(raw, 2026);
    expect(raw.map((m) => m.measurement_id)).toEqual(before);
  });
});

describe('buildTrendData (추이 차트 데이터)', () => {
  it('label은 측정일자(앞 10자), 등급은 Number 변환', () => {
    const [point] = buildTrendData([
      { year: 2026, measured_at: '2026-03-01T01:00:00Z', total_grade: '2', cardio_grade: 1, muscle_grade: null },
    ]);
    expect(point.label).toBe('2026-03-01');
    expect(point.total).toBe(2);
    expect(point.cardio).toBe(1);
    expect(point.muscle).toBeNull();
  });

  it('measured_at 없으면 연도를 label로 사용', () => {
    const [point] = buildTrendData([{ year: 2025, total_grade: 3 }]);
    expect(point.label).toBe('2025');
  });
});

describe('buildAvgRecord (전체 기간 평균 — 소수 1자리)', () => {
  it('빈 이력이면 null', () => {
    expect(buildAvgRecord([])).toBeNull();
  });

  it('등급/값 평균: avgFixed1(소수 1자리) — 결측치는 분모에서 제외', () => {
    const raw = selectRawMeasurements(measurements, 's1');
    const avg = buildAvgRecord(raw);
    expect(avg.total_grade).toBe(2); // (2+3+1)/3
    expect(avg.cardio_grade).toBe(2); // (1+3+2)/3
    expect(avg.cardio_value).toBe(70); // (80+60+70)/3
    expect(avg.bmi).toBe(21); // (20+21+22)/3
    expect(avg.muscle_grade).toBeNull(); // 전부 결측
  });

  it('일부 결측 시 존재하는 값만으로 평균', () => {
    const avg = buildAvgRecord([
      { total_grade: 1 }, { total_grade: 2 }, { total_grade: null },
    ]);
    expect(avg.total_grade).toBe(1.5);
  });
});
