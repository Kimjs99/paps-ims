import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMeasurements, saveMeasurement, saveMeasurementsBatch, getStudentMeasurements, batchUpdateMeasurementGrades } from '../api/measurements';

vi.mock('../api/sheetsClient', () => ({
  sheetsRequest: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
  nowKST: vi.fn(() => '2024-01-01T09:00:00+09:00'),
}));

import { sheetsRequest } from '../api/sheetsClient';

const SHEET_ID = 'test_sheet_id';

// 20컬럼 측정 행 mock (스키마 v1.1: measured_grade 포함)
const mockMeasRow = [
  'M001',        // measurement_id
  'S001',        // student_id
  '2024',        // year
  'shuttle_run', // cardio_type
  '75',          // cardio_value
  '1',           // cardio_grade
  'sit_up',      // muscle_type
  '45',          // muscle_value
  '2',           // muscle_grade
  '12.5',        // flexibility_value
  '1',           // flexibility_grade
  'sprint_50m',  // agility_type
  '7.2',         // agility_value
  '2',           // agility_grade
  '22.5',        // bmi
  '1',           // bmi_grade
  '1',           // total_grade
  '2024-01-15T09:00:00.000Z', // measured_at
  'teacher@example.com',       // teacher_email
  '2',                         // measured_grade (v1.1: 측정 당시 학년)
];

const expectedMeasurement = {
  measurement_id: 'M001',
  student_id: 'S001',
  year: 2024,
  cardio_type: 'shuttle_run',
  cardio_value: 75,
  cardio_grade: 1,
  muscle_type: 'sit_up',
  muscle_value: 45,
  muscle_grade: 2,
  flexibility_value: 12.5,
  flexibility_grade: 1,
  agility_type: 'sprint_50m',
  agility_value: 7.2,
  agility_grade: 2,
  bmi: 22.5,
  bmi_grade: 1,
  total_grade: 1,
  measured_at: '2024-01-15T09:00:00.000Z',
  teacher_email: 'teacher@example.com',
  measured_grade: 2,
};

describe('getMeasurements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('시트 데이터를 측정 객체 배열로 변환', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: [mockMeasRow] });
    const result = await getMeasurements(SHEET_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expectedMeasurement);
  });

  it('values가 없으면 빈 배열 반환', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const result = await getMeasurements(SHEET_ID);
    expect(result).toEqual([]);
  });

  it('구 19컬럼 행(스키마 1.0)은 measured_grade null — 하위호환 계약', async () => {
    const legacyRow = mockMeasRow.slice(0, 19); // T열(measured_grade) 없는 구 데이터
    sheetsRequest.mockResolvedValueOnce({ values: [legacyRow] });
    const [result] = await getMeasurements(SHEET_ID);
    expect(result.measured_grade).toBeNull();
    expect(result.teacher_email).toBe('teacher@example.com');
  });

  it('빈 문자열 숫자 필드는 null로 변환', async () => {
    const rowWithEmpty = [
      'M002', 'S001', '2024',
      'shuttle_run', '', '',  // cardio_value, cardio_grade = null
      'sit_up', '', '',
      '', '',
      'sprint_50m', '', '',
      '', '', '',
      '2024-01-15T09:00:00.000Z', '',
    ];
    sheetsRequest.mockResolvedValueOnce({ values: [rowWithEmpty] });
    const [result] = await getMeasurements(SHEET_ID);
    expect(result.cardio_value).toBeNull();
    expect(result.cardio_grade).toBeNull();
    expect(result.flexibility_value).toBeNull();
    expect(result.bmi).toBeNull();
    expect(result.total_grade).toBeNull();
  });
});

describe('saveMeasurement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST 요청 호출 확인', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const measurement = {
      measurement_id: 'M010',
      student_id: 'S001',
      year: 2024,
      cardio_type: 'shuttle_run',
      cardio_value: 80,
      cardio_grade: 1,
      muscle_type: 'sit_up',
      muscle_value: 50,
      muscle_grade: 1,
      flexibility_value: 15,
      flexibility_grade: 1,
      agility_type: 'sprint_50m',
      agility_value: 7.0,
      agility_grade: 1,
      bmi: 22.0,
      bmi_grade: 1,
      total_grade: 1,
      measured_at: '2024-03-01T00:00:00.000Z',
      teacher_email: 'teacher@example.com',
    };
    await saveMeasurement(SHEET_ID, measurement);
    expect(sheetsRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('null 필드는 빈 문자열로 직렬화', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const measurement = {
      measurement_id: 'M011',
      student_id: 'S002',
      year: 2024,
      cardio_type: null,
      cardio_value: null,
      cardio_grade: null,
      muscle_type: null,
      muscle_value: null,
      muscle_grade: null,
      flexibility_value: null,
      flexibility_grade: null,
      agility_type: null,
      agility_value: null,
      agility_grade: null,
      bmi: null,
      bmi_grade: null,
      total_grade: null,
    };
    await saveMeasurement(SHEET_ID, measurement);
    const call = sheetsRequest.mock.calls[0][0];
    const row = call.body.values[0];
    // null 값은 ""로 직렬화
    expect(row[3]).toBe('');   // cardio_type
    expect(row[4]).toBe('');   // cardio_value
  });
});

describe('saveMeasurementsBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('여러 측정값 일괄 POST', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const measurements = [
      { measurement_id: 'M1', student_id: 'S1', year: 2024 },
      { measurement_id: 'M2', student_id: 'S2', year: 2024 },
    ];
    await saveMeasurementsBatch(SHEET_ID, measurements);
    const call = sheetsRequest.mock.calls[0][0];
    expect(call.body.values).toHaveLength(2);
  });
});

describe('batchUpdateMeasurementGrades', () => {
  beforeEach(() => vi.clearAllMocks());

  it('key 일치 시 measurements key 컬럼 재조회 후 values:batchUpdate 호출', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: [['M001'], ['M002']] }); // key 컬럼 재조회
    sheetsRequest.mockResolvedValueOnce({}); // batchUpdate
    const items = [
      { rowIndex: 0, measurement: { measurement_id: 'M001', student_id: 'S001', year: 2024 } },
      { rowIndex: 1, measurement: { measurement_id: 'M002', student_id: 'S002', year: 2024 } },
    ];
    await batchUpdateMeasurementGrades(SHEET_ID, items);
    expect(sheetsRequest.mock.calls[0][0].path).toContain('A2:A');
    const writeCall = sheetsRequest.mock.calls[1][0];
    expect(writeCall.path).toContain('values:batchUpdate');
    expect(writeCall.body.data).toHaveLength(2);
    expect(writeCall.body.data[0].range).toContain('A2:T2');
  });

  it('key 불일치(행 밀림) 시 ROW_MISMATCH throw + 쓰기 미호출', async () => {
    // 다른 탭에서 행이 삭제돼 rowIndex 1이 다른 측정 기록을 가리키는 상황
    sheetsRequest.mockResolvedValueOnce({ values: [['M001'], ['M999']] });
    const items = [
      { rowIndex: 0, measurement: { measurement_id: 'M001', student_id: 'S001', year: 2024 } },
      { rowIndex: 1, measurement: { measurement_id: 'M002', student_id: 'S002', year: 2024 } },
    ];
    await expect(batchUpdateMeasurementGrades(SHEET_ID, items)).rejects.toMatchObject({
      code: 'ROW_MISMATCH',
    });
    expect(sheetsRequest).toHaveBeenCalledTimes(1); // 재조회만 — batchUpdate 미호출
  });

  it('빈 items면 아무 요청도 하지 않음', async () => {
    await batchUpdateMeasurementGrades(SHEET_ID, []);
    expect(sheetsRequest).not.toHaveBeenCalled();
  });
});

describe('getStudentMeasurements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('특정 학생 ID로 측정 이력 필터링', async () => {
    const row2 = [...mockMeasRow];
    row2[0] = 'M002';
    row2[1] = 'S002'; // 다른 학생
    sheetsRequest.mockResolvedValueOnce({ values: [mockMeasRow, row2] });
    const result = await getStudentMeasurements(SHEET_ID, 'S001');
    expect(result).toHaveLength(1);
    expect(result[0].student_id).toBe('S001');
  });

  it('해당 학생 없으면 빈 배열 반환', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: [mockMeasRow] });
    const result = await getStudentMeasurements(SHEET_ID, 'S999');
    expect(result).toEqual([]);
  });
});
