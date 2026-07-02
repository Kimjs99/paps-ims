import { sheetsRequest, withRetry } from "./sheetsClient";

// rowIndex 기반 쓰기의 동시성 보호 헬퍼
// — 클라이언트 캐시의 rowIndex는 다른 탭/교사가 행을 삭제하면 밀려서
//   엉뚱한 행을 덮어쓰거나 지울 수 있음 → 쓰기 직전 key 컬럼만 재조회해 대조한다.

export const ROW_MISMATCH_MESSAGE =
  "데이터가 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도하세요.";

// 호출부 catch에서 err.message가 그대로 toast로 노출되므로 메시지는 사용자 문구, 코드는 err.code로 식별
export const rowMismatchError = () =>
  Object.assign(new Error(ROW_MISMATCH_MESSAGE), { code: "ROW_MISMATCH" });

// 시트 key 컬럼(A열, 2행부터)을 배열로 반환 — 배열 index i == 0-based rowIndex i
export const fetchKeyColumn = async (sheetId, sheetName) => {
  const data = await withRetry(() =>
    sheetsRequest({ path: `/${sheetId}/values/${sheetName}!A2:A` })
  );
  return (data.values || []).map((row) => row?.[0] ?? "");
};
