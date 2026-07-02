import { sheetsRequest, withRetry } from "./sheetsClient";
import { SHEET_NAMES } from "../constants/paps";
import { rowMismatchError } from "./rowGuard";

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

// 인덱스 집합 동일성 비교 (순서 무관)
const sameIndexSet = (a, b) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
};

// 삭제 직전 최신 시트를 재조회해 삭제 대상 rowIndex를 재계산·검증 (하드 삭제는 비가역 — 동시성 보호)
// 1) 전달된 학생 인덱스 행이 모두 존재하고 단일 학급(grade-class)을 가리키는지 확인
// 2) 최신 데이터 기준으로 해당 학급의 학생/측정 rowIndex를 재계산
// 3) 재계산 결과가 클라이언트 캐시 기반 인덱스와 다르면(행 밀림·동시 추가 등) ROW_MISMATCH로 중단
const verifyAndRecomputeIndices = async (spreadsheetId, studentRowIndices, measurementRowIndices) => {
  const [studentsData, measData] = await Promise.all([
    withRetry(() =>
      sheetsRequest({ path: `/${spreadsheetId}/values/${SHEET_NAMES.STUDENTS}!A2:E` })
    ),
    withRetry(() =>
      sheetsRequest({ path: `/${spreadsheetId}/values/${SHEET_NAMES.MEASUREMENTS}!A2:B` })
    ),
  ]);
  const studentRows = studentsData.values || [];
  const measRows = measData.values || [];

  const targetRows = studentRowIndices.map((i) => studentRows[i]);
  if (targetRows.length === 0 || targetRows.some((r) => !r || !r[0])) throw rowMismatchError();
  const classKeys = new Set(targetRows.map((r) => `${Number(r[3])}-${Number(r[4])}`));
  if (classKeys.size !== 1) throw rowMismatchError();
  const [classKey] = classKeys;

  const freshStudentIndices = [];
  const freshStudentIds = new Set();
  studentRows.forEach((r, i) => {
    if (r && r[0] && `${Number(r[3])}-${Number(r[4])}` === classKey) {
      freshStudentIndices.push(i);
      freshStudentIds.add(r[0]);
    }
  });
  const freshMeasurementIndices = [];
  measRows.forEach((r, i) => {
    if (r && freshStudentIds.has(r[1])) freshMeasurementIndices.push(i);
  });

  if (
    !sameIndexSet(freshStudentIndices, studentRowIndices) ||
    !sameIndexSet(freshMeasurementIndices, measurementRowIndices)
  ) {
    throw rowMismatchError();
  }
  return { studentRowIndices: freshStudentIndices, measurementRowIndices: freshMeasurementIndices };
};

/**
 * 학급 데이터 완전 삭제 (하드 삭제)
 * - studentRowIndices: 전체 students 배열에서의 0-based 인덱스 (시트 행 = index + 2)
 * - measurementRowIndices: 전체 measurements 배열에서의 0-based 인덱스
 * ※ batchUpdate 내 요청 순서: 각 시트 안에서 인덱스 내림차순 → 행 이동 오염 방지
 * ※ 삭제 직전 최신 시트 재조회로 인덱스를 재계산·대조 — 불일치 시 ROW_MISMATCH throw (비가역 삭제 보호)
 */
export const deleteClassHard = async (spreadsheetId, cachedStudentRowIndices, cachedMeasurementRowIndices) => {
  if (cachedStudentRowIndices.length === 0 && cachedMeasurementRowIndices.length === 0) return;

  const { studentRowIndices, measurementRowIndices } = await verifyAndRecomputeIndices(
    spreadsheetId,
    cachedStudentRowIndices,
    cachedMeasurementRowIndices
  );

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
