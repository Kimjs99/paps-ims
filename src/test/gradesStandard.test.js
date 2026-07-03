import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedGradesStandard, isGradesStandardEmpty } from '../api/gradesStandard';
import { GRADES_SEED_BY_LEVEL } from '../utils/gradesStandardSeed';

vi.mock('../api/sheetsClient', () => ({
  sheetsRequest: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
}));

import { sheetsRequest } from '../api/sheetsClient';

const SHEET_ID = 'test_sheet_id';

describe('seedGradesStandard (PUT → clear 원자성 계약)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('새 기준표 PUT이 먼저, 잔행 clear가 나중 — clear 선행 시 중간 실패로 기준표가 빈 채 남는다', async () => {
    sheetsRequest.mockResolvedValue({});
    await seedGradesStandard(SHEET_ID, '중학교');

    expect(sheetsRequest).toHaveBeenCalledTimes(2);
    const [first, second] = sheetsRequest.mock.calls.map((c) => c[0]);
    expect(first.method).toBe('PUT');
    expect(first.path).toContain('valueInputOption=RAW');
    expect(second.method).toBe('POST');
    expect(second.path).toContain(':clear');
  });

  it('PUT 범위는 헤더+데이터 행 수와 정확히 일치, clear는 그 다음 행부터', async () => {
    sheetsRequest.mockResolvedValue({});
    await seedGradesStandard(SHEET_ID, '중학교');

    const rowCount = GRADES_SEED_BY_LEVEL['중학교'].length + 1; // +1 = 헤더
    const [putCall, clearCall] = sheetsRequest.mock.calls.map((c) => c[0]);
    expect(putCall.path).toContain(`!A1:I${rowCount}?`);
    expect(putCall.body.values).toHaveLength(rowCount);
    expect(clearCall.path).toContain(`!A${rowCount + 1}:I:clear`);
  });

  it('PUT 실패 시 clear를 시도하지 않음 — 기존 기준표 보존', async () => {
    sheetsRequest.mockRejectedValueOnce(new Error('network'));
    await expect(seedGradesStandard(SHEET_ID, '초등학교')).rejects.toThrow('network');
    expect(sheetsRequest).toHaveBeenCalledTimes(1); // clear 미호출
  });

  it('헤더 행이 첫 행, 데이터는 전부 문자열 직렬화', async () => {
    sheetsRequest.mockResolvedValue({});
    await seedGradesStandard(SHEET_ID, '고등학교');
    const { values } = sheetsRequest.mock.calls[0][0].body;
    expect(values[0]).toEqual([
      'grade_level', 'gender', 'item',
      'grade1_min', 'grade2_min', 'grade3_min', 'grade4_min', 'grade5_min',
      'higher_is_better',
    ]);
    values.slice(1).flat().forEach((cell) => expect(typeof cell).toBe('string'));
  });

  it('지원하지 않는 학교급은 throw + 요청 미발생', async () => {
    await expect(seedGradesStandard(SHEET_ID, '대학교')).rejects.toThrow('지원하지 않는 학교급');
    expect(sheetsRequest).not.toHaveBeenCalled();
  });
});

describe('isGradesStandardEmpty', () => {
  beforeEach(() => vi.clearAllMocks());

  it('데이터 행이 있으면 false', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: [['1']] });
    expect(await isGradesStandardEmpty(SHEET_ID)).toBe(false);
  });

  it('비어있으면 true', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    expect(await isGradesStandardEmpty(SHEET_ID)).toBe(true);
  });
});
