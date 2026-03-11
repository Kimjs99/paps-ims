import { sheetsRequest, withRetry, nowKST } from "./sheetsClient";
import { SHEET_NAMES } from "../constants/paps";

// 행 배열 → 학생 객체 변환 (birth_date 없음, 9컬럼)
const rowToStudent = (row) => ({
  student_id: row[0] || "",
  name: row[1] || "",
  gender: row[2] || "",
  grade: Number(row[3]) || 0,
  class: Number(row[4]) || 0,
  height: Number(row[5]) || 0,
  weight: Number(row[6]) || 0,
  created_at: row[7] || "",
  is_active: String(row[8]).toLowerCase() !== "false",
});

// 학생 객체 → 행 배열 변환
const studentToRow = (s) => [
  s.student_id, s.name, s.gender, s.grade, s.class,
  s.height, s.weight,
  s.created_at || nowKST(), s.is_active ?? true,
];

// 전체 학생 목록 조회
export const getStudents = async (sheetId) => {
  const data = await withRetry(() =>
    sheetsRequest({ path: `/${sheetId}/values/${SHEET_NAMES.STUDENTS}!A2:I` })
  );
  const rows = data.values || [];
  return rows.map(rowToStudent);
};

// 신규 학생 추가
export const addStudent = async (sheetId, student) => {
  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${sheetId}/values/${SHEET_NAMES.STUDENTS}!A:I:append?valueInputOption=RAW`,
      body: { values: [studentToRow(student)] },
    })
  );
};

// 학생 정보 수정 (rowIndex: 0-based, 실제 시트 행 = rowIndex + 2)
export const updateStudent = async (sheetId, rowIndex, student) => {
  const range = `${SHEET_NAMES.STUDENTS}!A${rowIndex + 2}:I${rowIndex + 2}`;
  await withRetry(() =>
    sheetsRequest({
      method: "PUT",
      path: `/${sheetId}/values/${range}?valueInputOption=RAW`,
      body: { values: [studentToRow(student)] },
    })
  );
};

// CSV 일괄 업로드
export const bulkAddStudents = async (sheetId, students) => {
  const values = students.map(studentToRow);
  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${sheetId}/values/${SHEET_NAMES.STUDENTS}!A:I:append?valueInputOption=RAW`,
      body: { values },
    })
  );
};
