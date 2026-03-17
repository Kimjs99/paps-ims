import { sheetsRequest, withRetry } from "./sheetsClient";
import { SHEET_NAMES } from "../constants/paps";

// 스프레드시트 내 시트별 gid 조회 (batchUpdate에 필요)
const getSheetGids = async (spreadsheetId) => {
  const data = await withRetry(() =>
    sheetsRequest({ path: `/${spreadsheetId}?fields=sheets.properties` })
  );
  const gidMap = {};
  (data.sheets || []).forEach(({ properties }) => {
    gidMap[properties.title] = properties.sheetId;
  });
  return gidMap;
};

/**
 * 학급 데이터 완전 삭제 (하드 삭제)
 * - studentRowIndices: 전체 students 배열에서의 0-based 인덱스 (시트 행 = index + 2)
 * - measurementRowIndices: 전체 measurements 배열에서의 0-based 인덱스
 * ※ batchUpdate 내 요청 순서: 각 시트 안에서 인덱스 내림차순 → 행 이동 오염 방지
 */
export const deleteClassHard = async (spreadsheetId, studentRowIndices, measurementRowIndices) => {
  const gids = await getSheetGids(spreadsheetId);
  const studentsGid = gids[SHEET_NAMES.STUDENTS];
  const measurementsGid = gids[SHEET_NAMES.MEASUREMENTS];

  const requests = [];

  // 측정 행 삭제 (내림차순)
  [...measurementRowIndices]
    .sort((a, b) => b - a)
    .forEach((rowIdx) => {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: measurementsGid,
            dimension: "ROWS",
            startIndex: rowIdx + 1, // 0=헤더, 1=첫 데이터 행
            endIndex: rowIdx + 2,
          },
        },
      });
    });

  // 학생 행 삭제 (내림차순)
  [...studentRowIndices]
    .sort((a, b) => b - a)
    .forEach((rowIdx) => {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: studentsGid,
            dimension: "ROWS",
            startIndex: rowIdx + 1,
            endIndex: rowIdx + 2,
          },
        },
      });
    });

  if (requests.length === 0) return;

  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${spreadsheetId}:batchUpdate`,
      body: { requests },
    })
  );
};
