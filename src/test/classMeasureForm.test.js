import { describe, it, expect } from 'vitest';
import { mergePrefillFormValues, restoreTypes, buildMeasurementRows } from '../pages/app/classMeasureForm';

const student = { student_id: '20240101', name: '김하나', gender: 'F', grade: 1, class: 2, height: 160, weight: 50 };
const studentNoBody = { student_id: '20240102', name: '박두리', gender: 'M', grade: 1, class: 2 };

describe('mergePrefillFormValues (프리필 병합)', () => {
  it('초안 없는 학생: 학생 키/몸무게 + 기존 측정값으로 채움', () => {
    const existing = { 20240101: { cardio_value: 45, muscle_value: 30, flexibility_value: 12, agility_value: 9.1 } };
    const next = mergePrefillFormValues({}, [student], existing);
    expect(next['20240101']).toEqual({
      height: 160, weight: 50,
      cardio_value: 45, muscle_value: 30, flexibility_value: 12, agility_value: 9.1,
    });
  });

  it('측정 이력 없는 학생: 측정값은 "" (키/몸무게만 채움, ?? "" — undefined 아님)', () => {
    const next = mergePrefillFormValues({}, [studentNoBody], {});
    expect(next['20240102']).toEqual({
      height: '', weight: '',
      cardio_value: '', muscle_value: '', flexibility_value: '', agility_value: '',
    });
  });

  it('초안 있는 학생: 초안 값을 절대 덮어쓰지 않음', () => {
    const prev = { 20240101: { height: '161', weight: '51', cardio_value: '99', muscle_value: '', flexibility_value: '', agility_value: '' } };
    const existing = { 20240101: { cardio_value: 45 } };
    const next = mergePrefillFormValues(prev, [student], existing);
    expect(next['20240101']).toEqual(prev['20240101']);
  });

  it('초안은 있지만 키/몸무게가 없으면 학생 데이터로 보충 (초안 필드 우선)', () => {
    const prev = { 20240101: { cardio_value: '99' } };
    const next = mergePrefillFormValues(prev, [student], {});
    expect(next['20240101']).toEqual({ height: 160, weight: 50, cardio_value: '99' });
  });

  it('원본 prev 객체는 변경하지 않음 (새 객체 반환)', () => {
    const prev = {};
    const next = mergePrefillFormValues(prev, [student], {});
    expect(prev).toEqual({});
    expect(next).not.toBe(prev);
  });
});

describe('restoreTypes (저장된 종목 타입 복원)', () => {
  it('측정 이력 없으면 기본 종목', () => {
    expect(restoreTypes({})).toEqual({
      cardio: 'shuttle_run', muscle: 'sit_up', agility: 'sprint_50m',
    });
  });

  it('첫 측정의 종목으로 복원', () => {
    const existing = { 20240101: { cardio_type: 'step_test', muscle_type: 'grip_strength', agility_type: 'standing_jump' } };
    expect(restoreTypes(existing)).toEqual({
      cardio: 'step_test', muscle: 'grip_strength', agility: 'standing_jump',
    });
  });

  it('종목 필드가 비어 있으면(구 데이터) 기본값으로 대체', () => {
    const existing = { 20240101: { cardio_type: '', muscle_type: null } };
    expect(restoreTypes(existing)).toEqual({
      cardio: 'shuttle_run', muscle: 'sit_up', agility: 'sprint_50m',
    });
  });
});

describe('buildMeasurementRows (저장 행 구성)', () => {
  // 심폐(shuttle_run)만 기준표 제공 — 나머지 영역 등급은 null이어야 함
  const gradesData = [
    { grade_level: 1, gender: 'F', item: 'shuttle_run', higher_is_better: true,
      grade1_min: 80, grade2_min: 60, grade3_min: 40, grade4_min: 20, grade5_min: 0 },
  ];
  const types = { cardioType: 'shuttle_run', muscleType: 'sit_up', agilityType: 'sprint_50m' };
  const meta = { schoolYear: 2026, teacherEmail: 'teacher@school.kr' };

  it('폼 값 → 숫자 변환, 빈 문자열은 null, 종목/연도/교사 메타 포함', () => {
    const formValues = { 20240101: { height: '', weight: '', cardio_value: '65', muscle_value: '', flexibility_value: '', agility_value: '' } };
    const [row] = buildMeasurementRows([student], formValues, types, meta, gradesData);
    expect(row.student_id).toBe('20240101');
    expect(row.year).toBe(2026);
    expect(row.cardio_type).toBe('shuttle_run');
    expect(row.cardio_value).toBe(65);
    expect(row.muscle_value).toBeNull();
    expect(row.flexibility_value).toBeNull();
    expect(row.agility_value).toBeNull();
    expect(row.teacher_email).toBe('teacher@school.kr');
    expect(row.measurement_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('등급 계산: 기준표 있는 영역만 등급, BMI는 키/몸무게에서 산출', () => {
    const formValues = { 20240101: { height: '', weight: '', cardio_value: '65', muscle_value: '', flexibility_value: '', agility_value: '' } };
    const [row] = buildMeasurementRows([student], formValues, types, meta, gradesData);
    expect(row.cardio_grade).toBe(2); // 60 <= 65 < 80
    expect(row.muscle_grade).toBeNull();
    expect(row.bmi).toBeCloseTo(50 / 1.6 / 1.6, 1); // 학생 레코드 키/몸무게 기준
  });

  it('폼에 키/몸무게 입력 시 학생 레코드 대신 폼 값으로 BMI 산출', () => {
    const formValues = { 20240101: { height: '170', weight: '60', cardio_value: '10', muscle_value: '', flexibility_value: '', agility_value: '' } };
    const [row] = buildMeasurementRows([student], formValues, types, meta, gradesData);
    expect(row.bmi).toBeCloseTo(60 / 1.7 / 1.7, 1);
    expect(row.cardio_grade).toBe(5);
  });

  it('학생마다 고유 measurement_id 생성', () => {
    const formValues = {
      20240101: { height: '', weight: '', cardio_value: '65', muscle_value: '', flexibility_value: '', agility_value: '' },
      20240102: { height: '', weight: '', cardio_value: '30', muscle_value: '', flexibility_value: '', agility_value: '' },
    };
    const rows = buildMeasurementRows([student, studentNoBody], formValues, types, meta, gradesData);
    expect(rows).toHaveLength(2);
    expect(rows[0].measurement_id).not.toBe(rows[1].measurement_id);
  });

  it('measured_grade에 측정 당시 학년 기록 (스키마 v1.1)', () => {
    const formValues = { 20240101: { height: '', weight: '', cardio_value: '65', muscle_value: '', flexibility_value: '', agility_value: '' } };
    const [row] = buildMeasurementRows([student], formValues, types, meta, gradesData);
    expect(row.measured_grade).toBe(student.grade);
  });
});
