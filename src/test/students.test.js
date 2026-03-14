import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStudents, addStudent, updateStudent, bulkAddStudents } from '../api/students';

// sheetsClient 전체를 mock
vi.mock('../api/sheetsClient', () => ({
  sheetsRequest: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
  nowKST: vi.fn(() => '2024-01-01T09:00:00+09:00'),
}));

import { sheetsRequest } from '../api/sheetsClient';

const SHEET_ID = 'test_sheet_id';

// 9컬럼 학생 행 mock
const mockRow = [
  'S001', '홍길동', 'M', '1', '3', '170', '65', '2024-01-01T00:00:00.000Z', 'true',
];

const expectedStudent = {
  student_id: 'S001',
  name: '홍길동',
  gender: 'M',
  grade: 1,
  class: 3,
  height: 170,
  weight: 65,
  created_at: '2024-01-01T00:00:00.000Z',
  is_active: true,
};

describe('getStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('시트 데이터를 학생 객체 배열로 변환', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: [mockRow] });
    const students = await getStudents(SHEET_ID);
    expect(students).toHaveLength(1);
    expect(students[0]).toEqual(expectedStudent);
  });

  it('빈 시트(values 없음) → 빈 배열 반환', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const students = await getStudents(SHEET_ID);
    expect(students).toEqual([]);
  });

  it('여러 행이 있으면 모두 변환', async () => {
    const row2 = ['S002', '김철수', 'F', '2', '1', '160', '55', '2024-02-01T00:00:00.000Z', 'false'];
    sheetsRequest.mockResolvedValueOnce({ values: [mockRow, row2] });
    const students = await getStudents(SHEET_ID);
    expect(students).toHaveLength(2);
    expect(students[1].is_active).toBe(false);
  });

  it('is_active가 "false" 문자열이면 false로 변환', async () => {
    const row = [...mockRow];
    row[8] = 'false';
    sheetsRequest.mockResolvedValueOnce({ values: [row] });
    const [student] = await getStudents(SHEET_ID);
    expect(student.is_active).toBe(false);
  });

  it('is_active가 "true" 문자열이면 true로 변환', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: [mockRow] });
    const [student] = await getStudents(SHEET_ID);
    expect(student.is_active).toBe(true);
  });

  it('누락된 컬럼 값은 빈 문자열 또는 0으로 처리', async () => {
    const incompleteRow = ['S003', ''];
    sheetsRequest.mockResolvedValueOnce({ values: [incompleteRow] });
    const [student] = await getStudents(SHEET_ID);
    expect(student.student_id).toBe('S003');
    expect(student.name).toBe('');
    expect(student.grade).toBe(0);
    expect(student.height).toBe(0);
  });
});

describe('addStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sheetsRequest POST 호출 확인', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const student = {
      student_id: 'S010',
      name: '신규학생',
      gender: 'M',
      grade: 2,
      class: 4,
      height: 175,
      weight: 70,
      created_at: '2024-03-01T00:00:00.000Z',
      is_active: true,
    };
    await addStudent(SHEET_ID, student);
    expect(sheetsRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('updateStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sheetsRequest PUT 호출 확인', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const student = {
      student_id: 'S001',
      name: '홍길동',
      gender: 'M',
      grade: 1,
      class: 3,
      height: 170,
      weight: 65,
      created_at: '2024-01-01T00:00:00.000Z',
      is_active: true,
    };
    await updateStudent(SHEET_ID, 0, student);
    expect(sheetsRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('rowIndex=0이면 시트 2행(A2:I2) 업데이트', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const student = { student_id: 'S001', name: '홍', gender: 'M', grade: 1, class: 1, height: 160, weight: 55, is_active: true };
    await updateStudent(SHEET_ID, 0, student);
    const call = sheetsRequest.mock.calls[0][0];
    expect(call.path).toContain('A2:I2');
  });
});

describe('bulkAddStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('여러 학생을 한 번에 POST', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const students = [
      { student_id: 'S1', name: 'A', gender: 'M', grade: 1, class: 1, height: 160, weight: 55, is_active: true },
      { student_id: 'S2', name: 'B', gender: 'F', grade: 1, class: 1, height: 158, weight: 50, is_active: true },
    ];
    await bulkAddStudents(SHEET_ID, students);
    const call = sheetsRequest.mock.calls[0][0];
    expect(call.body.values).toHaveLength(2);
  });
});
