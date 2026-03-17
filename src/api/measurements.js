import { sheetsRequest, withRetry, nowKST } from "./sheetsClient";
import { SHEET_NAMES } from "../constants/paps";

// 행 배열 → 측정 객체 변환
const rowToMeasurement = (row) => ({
  measurement_id: row[0] || "",
  student_id: row[1] || "",
  year: Number(row[2]) || 0,
  cardio_type: row[3] || "",
  cardio_value: row[4] !== "" ? Number(row[4]) : null,
  cardio_grade: row[5] !== "" ? Number(row[5]) : null,
  muscle_type: row[6] || "",
  muscle_value: row[7] !== "" ? Number(row[7]) : null,
  muscle_grade: row[8] !== "" ? Number(row[8]) : null,
  flexibility_value: row[9] !== "" ? Number(row[9]) : null,
  flexibility_grade: row[10] !== "" ? Number(row[10]) : null,
  agility_type: row[11] || "",
  agility_value: row[12] !== "" ? Number(row[12]) : null,
  agility_grade: row[13] !== "" ? Number(row[13]) : null,
  bmi: row[14] !== "" ? Number(row[14]) : null,
  bmi_grade: row[15] !== "" ? Number(row[15]) : null,
  total_grade: row[16] !== "" ? Number(row[16]) : null,
  measured_at: row[17] || "",
  teacher_email: row[18] || "",
});

// 측정 객체 → 행 배열 변환
const measurementToRow = (m) => [
  m.measurement_id, m.student_id, m.year,
  m.cardio_type ?? "", m.cardio_value ?? "", m.cardio_grade ?? "",
  m.muscle_type ?? "", m.muscle_value ?? "", m.muscle_grade ?? "",
  m.flexibility_value ?? "", m.flexibility_grade ?? "",
  m.agility_type ?? "", m.agility_value ?? "", m.agility_grade ?? "",
  m.bmi ?? "", m.bmi_grade ?? "", m.total_grade ?? "",
  m.measured_at || nowKST(),
  m.teacher_email || "",
];

// 전체 측정 데이터 조회
export const getMeasurements = async (sheetId) => {
  const data = await withRetry(() =>
    sheetsRequest({ path: `/${sheetId}/values/${SHEET_NAMES.MEASUREMENTS}!A2:S` })
  );
  const rows = data.values || [];
  return rows.map(rowToMeasurement);
};

// 단일 측정 저장 (UUID는 호출 전 생성)
export const saveMeasurement = async (sheetId, measurement) => {
  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${sheetId}/values/${SHEET_NAMES.MEASUREMENTS}!A:S:append?valueInputOption=RAW`,
      body: { values: [measurementToRow(measurement)] },
    })
  );
};

// 기존 측정 행들의 등급 컬럼만 덮어쓰기 (batchUpdate)
// items: [{ rowIndex: number (0-based array index), measurement: object }]
export const batchUpdateMeasurementGrades = async (sheetId, items) => {
  if (!items.length) return;
  const data = items.map(({ rowIndex, measurement }) => ({
    range: `${SHEET_NAMES.MEASUREMENTS}!A${rowIndex + 2}:S${rowIndex + 2}`,
    values: [measurementToRow(measurement)],
  }));
  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${sheetId}/values:batchUpdate`,
      body: { valueInputOption: "RAW", data },
    })
  );
};

// 학급 단위 일괄 저장
export const saveMeasurementsBatch = async (sheetId, measurements) => {
  const values = measurements.map(measurementToRow);
  await withRetry(() =>
    sheetsRequest({
      method: "POST",
      path: `/${sheetId}/values/${SHEET_NAMES.MEASUREMENTS}!A:S:append?valueInputOption=RAW`,
      body: { values },
    })
  );
};

// 특정 학생의 측정 이력 조회
export const getStudentMeasurements = async (sheetId, studentId) => {
  const all = await getMeasurements(sheetId);
  return all.filter((m) => m.student_id === studentId);
};
