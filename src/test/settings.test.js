import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, checkSchemaVersion, saveSettings } from '../api/settings';

vi.mock('../api/sheetsClient', () => ({
  sheetsRequest: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
}));

import { sheetsRequest } from '../api/sheetsClient';

const SHEET_ID = 'test_sheet_id';

describe('getSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('A:B 열 데이터를 키-값 객체로 변환', async () => {
    sheetsRequest.mockResolvedValueOnce({
      values: [
        ['SCHEMA_VERSION', '1.0'],
        ['school_name', '테스트학교'],
        ['teacher_name', '김선생'],
      ],
    });
    const settings = await getSettings(SHEET_ID);
    expect(settings['SCHEMA_VERSION']).toBe('1.0');
    expect(settings['school_name']).toBe('테스트학교');
    expect(settings['teacher_name']).toBe('김선생');
  });

  it('빈 시트이면 빈 객체 반환', async () => {
    sheetsRequest.mockResolvedValueOnce({});
    const settings = await getSettings(SHEET_ID);
    expect(settings).toEqual({});
  });
});

describe('checkSchemaVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SCHEMA_VERSION이 현재 버전과 일치하면 true', async () => {
    sheetsRequest.mockResolvedValueOnce({
      values: [['SCHEMA_VERSION', '1.0']],
    });
    const result = await checkSchemaVersion(SHEET_ID);
    expect(result).toBe(true);
  });

  it('SCHEMA_VERSION이 다르면 false', async () => {
    sheetsRequest.mockResolvedValueOnce({
      values: [['SCHEMA_VERSION', '0.9']],
    });
    const result = await checkSchemaVersion(SHEET_ID);
    expect(result).toBe(false);
  });

  it('SCHEMA_VERSION 키가 없으면 false', async () => {
    sheetsRequest.mockResolvedValueOnce({
      values: [['school_name', '학교']],
    });
    const result = await checkSchemaVersion(SHEET_ID);
    expect(result).toBe(false);
  });
});

describe('saveSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기존 설정과 새 설정을 병합하여 PUT 요청', async () => {
    // getSettings 호출 (첫 번째 sheetsRequest)
    sheetsRequest.mockResolvedValueOnce({
      values: [['SCHEMA_VERSION', '1.0'], ['school_name', '기존학교']],
    });
    // saveSettings PUT 호출 (두 번째 sheetsRequest)
    sheetsRequest.mockResolvedValueOnce({});

    await saveSettings(SHEET_ID, { school_name: '새학교', teacher_name: '새선생' });

    expect(sheetsRequest).toHaveBeenCalledTimes(2);
    const putCall = sheetsRequest.mock.calls[1][0];
    expect(putCall.method).toBe('PUT');

    // 병합된 값 확인
    const values = putCall.body.values;
    const schoolNameEntry = values.find(([k]) => k === 'school_name');
    expect(schoolNameEntry[1]).toBe('새학교');
    const schemaEntry = values.find(([k]) => k === 'SCHEMA_VERSION');
    expect(schemaEntry[1]).toBe('1.0');
  });

  it('모든 값을 문자열로 변환하여 저장', async () => {
    sheetsRequest.mockResolvedValueOnce({ values: [] });
    sheetsRequest.mockResolvedValueOnce({});
    await saveSettings(SHEET_ID, { school_year: 2026 });
    const putCall = sheetsRequest.mock.calls[1][0];
    const yearEntry = putCall.body.values.find(([k]) => k === 'school_year');
    expect(yearEntry[1]).toBe('2026');
  });
});
