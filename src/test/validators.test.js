import { describe, it, expect } from 'vitest';
import { studentSchema, measurementSchema } from '../utils/validators';

// Zod v4에서 parse 실패 시 ZodError throw
const parseResult = (schema, data) => {
  const result = schema.safeParse(data);
  return result;
};

describe('studentSchema', () => {
  const validStudent = {
    student_id: 'S001',
    name: '홍길동',
    gender: 'M',
    grade: 1,
    class: 3,
    height: 170,
    weight: 65,
  };

  it('유효한 학생 데이터 → success', () => {
    const result = parseResult(studentSchema, validStudent);
    expect(result.success).toBe(true);
  });

  it('여성(F) 성별도 유효', () => {
    const result = parseResult(studentSchema, { ...validStudent, gender: 'F' });
    expect(result.success).toBe(true);
  });

  it('student_id 빈 문자열 → 실패', () => {
    const result = parseResult(studentSchema, { ...validStudent, student_id: '' });
    expect(result.success).toBe(false);
  });

  it('name 빈 문자열 → 실패', () => {
    const result = parseResult(studentSchema, { ...validStudent, name: '' });
    expect(result.success).toBe(false);
  });

  it('잘못된 gender(X) → 실패', () => {
    const result = parseResult(studentSchema, { ...validStudent, gender: 'X' });
    expect(result.success).toBe(false);
  });

  it('grade 0 → 실패 (min=1)', () => {
    const result = parseResult(studentSchema, { ...validStudent, grade: 0 });
    expect(result.success).toBe(false);
  });

  it('grade 4 → 실패 (max=3)', () => {
    const result = parseResult(studentSchema, { ...validStudent, grade: 4 });
    expect(result.success).toBe(false);
  });

  it('grade 문자열 숫자("2") → coerce로 성공', () => {
    const result = parseResult(studentSchema, { ...validStudent, grade: '2' });
    expect(result.success).toBe(true);
    expect(result.data.grade).toBe(2);
  });

  it('class 0 → 실패 (min=1)', () => {
    const result = parseResult(studentSchema, { ...validStudent, class: 0 });
    expect(result.success).toBe(false);
  });

  it('class 21 → 실패 (max=20)', () => {
    const result = parseResult(studentSchema, { ...validStudent, class: 21 });
    expect(result.success).toBe(false);
  });

  it('height 99cm → 실패 (min=100)', () => {
    const result = parseResult(studentSchema, { ...validStudent, height: 99 });
    expect(result.success).toBe(false);
  });

  it('height 221cm → 실패 (max=220)', () => {
    const result = parseResult(studentSchema, { ...validStudent, height: 221 });
    expect(result.success).toBe(false);
  });

  it('weight 19kg → 실패 (min=20)', () => {
    const result = parseResult(studentSchema, { ...validStudent, weight: 19 });
    expect(result.success).toBe(false);
  });

  it('weight 151kg → 실패 (max=150)', () => {
    const result = parseResult(studentSchema, { ...validStudent, weight: 151 });
    expect(result.success).toBe(false);
  });

  it('height 문자열 숫자("170") → coerce로 성공', () => {
    const result = parseResult(studentSchema, { ...validStudent, height: '170' });
    expect(result.success).toBe(true);
    expect(result.data.height).toBe(170);
  });

  it('weight 문자열 숫자("65") → coerce로 성공', () => {
    const result = parseResult(studentSchema, { ...validStudent, weight: '65' });
    expect(result.success).toBe(true);
    expect(result.data.weight).toBe(65);
  });

  it('grade 경계값 1 → 성공', () => {
    expect(parseResult(studentSchema, { ...validStudent, grade: 1 }).success).toBe(true);
  });

  it('grade 경계값 3 → 성공', () => {
    expect(parseResult(studentSchema, { ...validStudent, grade: 3 }).success).toBe(true);
  });

  it('height 경계값 100 → 성공', () => {
    expect(parseResult(studentSchema, { ...validStudent, height: 100 }).success).toBe(true);
  });

  it('height 경계값 220 → 성공', () => {
    expect(parseResult(studentSchema, { ...validStudent, height: 220 }).success).toBe(true);
  });
});

describe('measurementSchema', () => {
  it('빈 객체 → 모두 optional이므로 성공', () => {
    const result = parseResult(measurementSchema, {});
    expect(result.success).toBe(true);
  });

  it('유효한 측정값 전체 입력 → 성공', () => {
    const data = {
      cardio_type: 'shuttle_run',
      cardio_value: 75,
      muscle_type: 'sit_up',
      muscle_value: 45,
      flexibility_value: 12.5,
      agility_type: 'sprint_50m',
      agility_value: 7.5,
    };
    const result = parseResult(measurementSchema, data);
    expect(result.success).toBe(true);
  });

  it('flexibility_value -21 → 실패 (min=-20)', () => {
    const result = parseResult(measurementSchema, { flexibility_value: -21 });
    expect(result.success).toBe(false);
  });

  it('flexibility_value 31 → 실패 (max=30)', () => {
    const result = parseResult(measurementSchema, { flexibility_value: 31 });
    expect(result.success).toBe(false);
  });

  it('flexibility_value 경계값 -20 → 성공', () => {
    const result = parseResult(measurementSchema, { flexibility_value: -20 });
    expect(result.success).toBe(true);
  });

  it('flexibility_value 경계값 30 → 성공', () => {
    const result = parseResult(measurementSchema, { flexibility_value: 30 });
    expect(result.success).toBe(true);
  });

  it('flexibility_value null → 성공 (nullable)', () => {
    const result = parseResult(measurementSchema, { flexibility_value: null });
    expect(result.success).toBe(true);
  });

  it('cardio_value 문자열 숫자 → coerce로 성공', () => {
    const result = parseResult(measurementSchema, { cardio_value: '80' });
    expect(result.success).toBe(true);
    expect(result.data.cardio_value).toBe(80);
  });

  it('cardio_type 문자열 → 성공', () => {
    const result = parseResult(measurementSchema, { cardio_type: 'endurance_run' });
    expect(result.success).toBe(true);
  });
});
