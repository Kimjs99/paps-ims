import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteClassHard } from '../api/deleteClass';

vi.mock('../api/sheetsClient', () => ({
  sheetsRequest: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
  nowKST: vi.fn(() => '2024-01-01T09:00:00+09:00'),
}));

import { sheetsRequest } from '../api/sheetsClient';

const SHEET_ID = 'test_sheet_id';

// 최신 시트 상태 mock — students!A2:E (id, 이름, 성별, 학년, 반)
const freshStudents = [
  ['S1', '가', 'M', '1', '3'],
  ['S2', '나', 'F', '1', '3'],
  ['S3', '다', 'M', '2', '1'],
];
// measurements!A2:B (measurement_id, student_id)
const freshMeasurements = [
  ['M1', 'S1'],
  ['M2', 'S3'],
  ['M3', 'S2'],
];

const gidsResponse = {
  sheets: [
    { properties: { title: 'students', sheetId: 111 } },
    { properties: { title: 'measurements', sheetId: 222 } },
  ],
};

// 호출 순서: 1) students 재조회 2) measurements 재조회 3) gid 조회 4) batchUpdate
const mockHappyPath = () => {
  sheetsRequest.mockResolvedValueOnce({ values: freshStudents });
  sheetsRequest.mockResolvedValueOnce({ values: freshMeasurements });
  sheetsRequest.mockResolvedValueOnce(gidsResponse);
  sheetsRequest.mockResolvedValueOnce({});
};

describe('deleteClassHard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인덱스가 최신 시트와 일치하면 재계산된 인덱스로 batchUpdate 삭제 (내림차순)', async () => {
    mockHappyPath();
    // 1학년 3반(S1, S2) 삭제 — 측정은 M1(S1), M3(S2)
    await deleteClassHard(SHEET_ID, [0, 1], [0, 2]);

    const batchCall = sheetsRequest.mock.calls[3][0];
    expect(batchCall.method).toBe('POST');
    expect(batchCall.path).toContain(':batchUpdate');

    const requests = batchCall.body.requests;
    // 측정 2행 + 학생 2행
    expect(requests).toHaveLength(4);
    // 측정 행 먼저, 각 시트 안에서 내림차순 (행 이동 오염 방지)
    expect(requests[0].deleteDimension.range).toMatchObject({ sheetId: 222, startIndex: 3, endIndex: 4 }); // meas rowIdx 2
    expect(requests[1].deleteDimension.range).toMatchObject({ sheetId: 222, startIndex: 1, endIndex: 2 }); // meas rowIdx 0
    expect(requests[2].deleteDimension.range).toMatchObject({ sheetId: 111, startIndex: 2, endIndex: 3 }); // student rowIdx 1
    expect(requests[3].deleteDimension.range).toMatchObject({ sheetId: 111, startIndex: 1, endIndex: 2 }); // student rowIdx 0
  });

  it('행 밀림(위쪽 행 삭제로 시프트) 시 ROW_MISMATCH throw + 삭제 미실행', async () => {
    // 캐시 기준 [1, 2]가 1-3반이었지만, 다른 탭에서 첫 행이 삭제돼 전체가 한 칸 밀린 상황
    sheetsRequest.mockResolvedValueOnce({ values: freshStudents });
    sheetsRequest.mockResolvedValueOnce({ values: freshMeasurements });

    await expect(deleteClassHard(SHEET_ID, [1, 2], [0, 2])).rejects.toMatchObject({
      code: 'ROW_MISMATCH',
    });
    // 재조회 2회만 — batchUpdate(삭제) 미호출
    expect(sheetsRequest).toHaveBeenCalledTimes(2);
  });

  it('대상 인덱스가 최신 시트 범위를 벗어나면 ROW_MISMATCH throw', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: freshStudents });
    sheetsRequest.mockResolvedValueOnce({ values: freshMeasurements });

    await expect(deleteClassHard(SHEET_ID, [0, 1, 9], [0, 2])).rejects.toMatchObject({
      code: 'ROW_MISMATCH',
    });
    expect(sheetsRequest).toHaveBeenCalledTimes(2);
  });

  it('학급 인덱스가 최신 학급 구성과 불일치(동시 추가 등)하면 ROW_MISMATCH throw', async () => {
    // 다른 교사가 1학년 3반에 S4를 추가한 상황 — 캐시 기반 인덱스는 S4를 모름
    const withNewStudent = [...freshStudents, ['S4', '라', 'F', '1', '3']];
    sheetsRequest.mockResolvedValueOnce({ values: withNewStudent });
    sheetsRequest.mockResolvedValueOnce({ values: freshMeasurements });

    await expect(deleteClassHard(SHEET_ID, [0, 1], [0, 2])).rejects.toMatchObject({
      code: 'ROW_MISMATCH',
    });
    expect(sheetsRequest).toHaveBeenCalledTimes(2);
  });

  it('측정 인덱스가 최신 측정 구성과 불일치하면 ROW_MISMATCH throw', async () => {
    // 다른 탭에서 S1의 측정 M4가 추가된 상황
    const withNewMeas = [...freshMeasurements, ['M4', 'S1']];
    sheetsRequest.mockResolvedValueOnce({ values: freshStudents });
    sheetsRequest.mockResolvedValueOnce({ values: withNewMeas });

    await expect(deleteClassHard(SHEET_ID, [0, 1], [0, 2])).rejects.toMatchObject({
      code: 'ROW_MISMATCH',
    });
    expect(sheetsRequest).toHaveBeenCalledTimes(2);
  });

  it('둘 다 빈 배열이면 아무 요청도 하지 않음', async () => {
    await deleteClassHard(SHEET_ID, [], []);
    expect(sheetsRequest).not.toHaveBeenCalled();
  });
});
