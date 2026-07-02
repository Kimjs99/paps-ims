import { describe, it, expect, vi, beforeEach } from "vitest";

// useQuery에 전달되는 옵션을 검사하기 위해 부분 mock
const useQueryMock = vi.fn(() => ({ data: [] }));
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useQuery: (...args) => useQueryMock(...args) };
});

vi.mock("../store/settingsStore", () => ({
  useSettingsStore: (selector) => selector({ sheetId: "sheet-1" }),
}));

vi.mock("../api/students", () => ({
  getStudents: vi.fn(),
  addStudent: vi.fn(),
  updateStudent: vi.fn(),
  bulkAddStudents: vi.fn(),
  deactivateStudent: vi.fn(),
  deactivateClassStudents: vi.fn(),
}));

vi.mock("../api/measurements", () => ({
  getMeasurements: vi.fn(),
  saveMeasurement: vi.fn(),
  saveMeasurementsBatch: vi.fn(),
}));

vi.mock("../api/deleteClass", () => ({
  deleteClassHard: vi.fn(),
}));

import { useMeasurements } from "../hooks/useSheets";

const lastQueryOptions = () =>
  useQueryMock.mock.calls[useQueryMock.mock.calls.length - 1][0];

describe("useMeasurements poll 옵션", () => {
  beforeEach(() => {
    useQueryMock.mockClear();
  });

  it("기본값(인자 없음): 30초 폴링 유지 — 대시보드 등 기존 호출자 무변경", () => {
    useMeasurements();
    const opts = lastQueryOptions();
    expect(opts.queryKey).toEqual(["measurements", "sheet-1"]);
    expect(opts.enabled).toBe(true);
    expect(opts.refetchInterval).toBe(30 * 1000);
    expect(opts.refetchOnWindowFocus).toBe(true);
  });

  it("poll: true 명시 시에도 30초 폴링", () => {
    useMeasurements({ poll: true });
    expect(lastQueryOptions().refetchInterval).toBe(30 * 1000);
  });

  it("poll: false — 측정 입력 페이지용, 폴링·포커스 refetch 중단", () => {
    useMeasurements({ poll: false });
    const opts = lastQueryOptions();
    expect(opts.refetchInterval).toBe(false);
    expect(opts.refetchOnWindowFocus).toBe(false);
    // queryKey는 동일 — 저장 후 invalidateQueries 갱신 흐름은 유지
    expect(opts.queryKey).toEqual(["measurements", "sheet-1"]);
  });
});
