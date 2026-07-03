import { sheetsRequest, withRetry } from "./sheetsClient";
import { SHEET_NAMES } from "../constants/paps";
import { GRADES_SEED_BY_LEVEL } from "../utils/gradesStandardSeed";

// grades_standard 시트가 비어있는지 확인
export const isGradesStandardEmpty = async (sheetId) => {
  const data = await withRetry(() =>
    sheetsRequest({ path: `/${sheetId}/values/${SHEET_NAMES.GRADES_STANDARD}!A2:A` })
  );
  return !(data.values && data.values.length > 0);
};

// 학교급에 맞는 PAPS 등급 기준 데이터 시드
export const seedGradesStandard = async (sheetId, schoolLevel) => {
  const rows = GRADES_SEED_BY_LEVEL[schoolLevel];
  if (!rows || rows.length === 0) {
    throw new Error(`지원하지 않는 학교급: ${schoolLevel}`);
  }

  // 헤더 + 데이터 한 번에 쓰기
  const header = ["grade_level", "gender", "item", "grade1_min", "grade2_min", "grade3_min", "grade4_min", "grade5_min", "higher_is_better"];
  const values = [header, ...rows.map((row) => row.map(String))];

  // 새 기준표 PUT → 잔행 clear 순서 유지 필수.
  // clear→PUT 순서는 clear 후 PUT이 실패하면 기준표가 빈 채로 남아 모든 등급 계산이 멈춘다.
  // PUT→clear 순서는 어느 단계에서 실패해도 완전한 기준표(기존 또는 신규)가 유지되고,
  // clear 실패로 남은 잔행은 calcGrade의 find()가 상단(신규 데이터)을 먼저 매칭하므로 무해하다.
  await withRetry(() =>
    sheetsRequest({
      method: "PUT",
      path: `/${sheetId}/values/${SHEET_NAMES.GRADES_STANDARD}!A1:I${values.length}?valueInputOption=RAW`,
      body: { values },
    })
  );

  // 행 수가 다른 기준표로 재시드할 때 잔행 제거 (예: 초등 → 중·고)
  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${sheetId}/values/${SHEET_NAMES.GRADES_STANDARD}!A${values.length + 1}:I:clear`,
    })
  );
};
