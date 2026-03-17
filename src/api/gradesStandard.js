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

  await withRetry(() =>
    sheetsRequest({
      method: "PUT",
      path: `/${sheetId}/values/${SHEET_NAMES.GRADES_STANDARD}!A1:I?valueInputOption=RAW`,
      body: { values },
    })
  );
};
