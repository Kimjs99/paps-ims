import { describe, it, expect } from 'vitest';
import {
  filterMeasurements, buildReportMeasurements,
  getAvailableYears, getAvailableClasses, filterStudents, buildClassLabel,
} from '../pages/dashboard/reportData';

const activeStudents = [
  { student_id: 's1', name: '김하나', grade: 1, class: 1, is_active: true },
  { student_id: 's2', name: '박두리', grade: 1, class: 2, is_active: true },
  { student_id: 's3', name: '이세나', grade: 2, class: 1, is_active: true },
];

const noFilter = { filterYear: '', filterGrade: '', filterClass: '' };

describe('filterMeasurements (year/학년/반 필터)', () => {
  const list = [
    { student_id: 's1', year: 2026 },
    { student_id: 's2', year: 2025 },
    { student_id: 's3', year: 2026 },
    { student_id: 'ghost', year: 2026 }, // activeStudents에 없는 학생
  ];

  it('무필터면 그대로 반환 (미매칭 학생도 유지 — 학년/반 필터 시에만 매칭 검사)', () => {
    expect(filterMeasurements(list, activeStudents, noFilter)).toEqual(list);
  });

  it('연도 필터 (String 비교)', () => {
    const out = filterMeasurements(list, activeStudents, { ...noFilter, filterYear: '2026' });
    expect(out.map((m) => m.student_id)).toEqual(['s1', 's3', 'ghost']);
  });

  it('학년 필터 — activeStudents 미매칭 측정은 제외', () => {
    const out = filterMeasurements(list, activeStudents, { ...noFilter, filterGrade: '1' });
    expect(out.map((m) => m.student_id)).toEqual(['s1', 's2']);
  });

  it('학년+반 필터 조합', () => {
    const out = filterMeasurements(list, activeStudents, { ...noFilter, filterGrade: '1', filterClass: '2' });
    expect(out.map((m) => m.student_id)).toEqual(['s2']);
  });
});

describe('buildReportMeasurements (학생별 평균 등급 — 최우수 병합 금지)', () => {
  it('학생별 그룹핑 후 등급 평균(Math.round) — 최우수 병합이 아님', () => {
    const measurements = [
      { student_id: 's1', year: 2026, cardio_grade: 1, total_grade: 1 },
      { student_id: 's1', year: 2026, cardio_grade: 4, total_grade: 4 },
    ];
    const [row] = buildReportMeasurements(measurements, activeStudents, noFilter);
    // 최우수 병합이면 1, 평균이면 round(2.5) = 3
    expect(row.cardio_grade).toBe(3);
    expect(row.total_grade).toBe(3);
    expect(row.student_id).toBe('s1');
  });

  it('비활성 학생 측정은 무필터 시에도 무조건 제외 (v0.12.1 활성 선행 필터)', () => {
    const measurements = [
      { student_id: 's1', year: 2026, total_grade: 2 },
      { student_id: 'inactive-kid', year: 2026, total_grade: 1 },
    ];
    const rows = buildReportMeasurements(measurements, activeStudents, noFilter);
    expect(rows.map((r) => r.student_id)).toEqual(['s1']);
  });

  it('범위 밖 등급(0, 6, NaN)은 평균에서 제외', () => {
    const measurements = [
      { student_id: 's1', year: 2026, cardio_grade: 2, total_grade: 2 },
      { student_id: 's1', year: 2026, cardio_grade: 0, total_grade: 'x' },
      { student_id: 's1', year: 2026, cardio_grade: 6, total_grade: null },
    ];
    const [row] = buildReportMeasurements(measurements, activeStudents, noFilter);
    expect(row.cardio_grade).toBe(2);
    expect(row.total_grade).toBe(2);
  });

  it('유효 등급이 하나도 없으면 null', () => {
    const measurements = [{ student_id: 's1', year: 2026 }];
    const [row] = buildReportMeasurements(measurements, activeStudents, noFilter);
    expect(row.cardio_grade).toBeNull();
    expect(row.muscle_grade).toBeNull();
    expect(row.flexibility_grade).toBeNull();
    expect(row.agility_grade).toBeNull();
    expect(row.bmi_grade).toBeNull();
    expect(row.total_grade).toBeNull();
  });

  it('연도/학년/반 필터가 평균 계산 대상에 반영', () => {
    const measurements = [
      { student_id: 's1', year: 2025, total_grade: 5 },
      { student_id: 's1', year: 2026, total_grade: 1 },
      { student_id: 's3', year: 2026, total_grade: 3 },
    ];
    const rows = buildReportMeasurements(measurements, activeStudents, {
      filterYear: '2026', filterGrade: '1', filterClass: '',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ student_id: 's1', total_grade: 1 }); // 2025 기록 제외
  });
});

describe('getAvailableYears (연도 목록·최신순)', () => {
  it('중복 제거 + 내림차순 + falsy 제외', () => {
    expect(getAvailableYears([{ year: 2025 }, { year: 2026 }, { year: 2025 }, { year: null }]))
      .toEqual([2026, 2025]);
  });
});

describe('getAvailableClasses (반 목록·학년 필터 반영)', () => {
  it('전체 학년: 중복 제거 + 숫자 오름차순', () => {
    expect(getAvailableClasses(activeStudents, '')).toEqual([1, 2]);
  });

  it('학년 필터 시 해당 학년의 반만', () => {
    expect(getAvailableClasses(activeStudents, '2')).toEqual([1]);
  });
});

describe('filterStudents (학생 목록 필터)', () => {
  it('학년+반 필터', () => {
    expect(filterStudents(activeStudents, { filterGrade: '1', filterClass: '2' }))
      .toEqual([activeStudents[1]]);
  });

  it('무필터면 전체', () => {
    expect(filterStudents(activeStudents, { filterGrade: '', filterClass: '' }))
      .toEqual(activeStudents);
  });
});

describe('buildClassLabel (필터 레이블)', () => {
  it('학년+반+연도 조합', () => {
    expect(buildClassLabel({ filterGrade: '1', filterClass: '2', filterYear: '2026' }))
      .toBe('1학년 2반 2026년도');
  });

  it('부분 필터', () => {
    expect(buildClassLabel({ filterGrade: '', filterClass: '', filterYear: '2026' })).toBe('2026년도');
  });

  it('무필터면 "전체"', () => {
    expect(buildClassLabel({ filterGrade: '', filterClass: '', filterYear: '' })).toBe('전체');
  });
});
