// ClassMeasure 저장 시 "변경된(dirty) 학생"만 선별하기 위한 순수 함수 모음.
// 컴포넌트 파일(ClassMeasure.jsx)에서 분리한 이유: react-refresh/only-export-components 경고 회피 + 단위 테스트 용이.
// 테스트: src/test/classMeasureDirty.test.js

export const MEASURE_FIELDS = [
  "height",
  "weight",
  "cardio_value",
  "muscle_value",
  "flexibility_value",
  "agility_value",
];

// 폼 값(문자열)과 시트 값(숫자)을 비교 가능한 형태로 정규화 — "", null, undefined는 모두 빈 값으로 취급
export const normalizeValue = (v) =>
  v === "" || v === null || v === undefined ? "" : String(v);

// 프리필 시점 스냅샷(기준선) 생성: 학생 키/몸무게 + 기존 측정값 (localStorage draft는 미포함 — draft는 미저장 변경분이므로 dirty로 판정돼야 함)
export const buildBaseline = (students, existingMeasurements = {}) => {
  const baseline = {};
  students.forEach((s) => {
    const m = existingMeasurements[s.student_id];
    baseline[s.student_id] = {
      height: s.height ?? "",
      weight: s.weight ?? "",
      cardio_value: m?.cardio_value ?? "",
      muscle_value: m?.muscle_value ?? "",
      flexibility_value: m?.flexibility_value ?? "",
      agility_value: m?.agility_value ?? "",
    };
  });
  return baseline;
};

// 한 학생의 폼 행이 스냅샷과 다른지 (필드 하나라도 다르면 dirty)
export const isRowDirty = (formRow, baselineRow) => {
  if (!formRow) return false;
  const base = baselineRow || {};
  return MEASURE_FIELDS.some(
    (f) => normalizeValue(formRow[f]) !== normalizeValue(base[f])
  );
};

// 종목(학급 공통 Select) 변경 시 재저장이 필요한 값 필드 — 해당 영역 값이 있는 행은 등급 재계산 대상
export const AREA_VALUE_FIELD = {
  cardio: "cardio_value",
  muscle: "muscle_value",
  agility: "agility_value",
};

// 저장 대상 선별: 스냅샷과 달라진 학생 중 값이 하나라도 입력된 학생만
// (전 필드를 비운 행은 append 대상에서 제외 — 기존 "값이 하나라도 있는 학생" 규칙 유지)
// changedAreas: 프리필 이후 종목이 바뀐 영역 목록(["cardio", ...]) — 값이 같아도 종목이 바뀌면 저장돼야 함
export const selectDirtyStudents = (students, formValues, baseline, changedAreas = []) =>
  students.filter((s) => {
    const row = formValues[s.student_id];
    if (!row) return false;
    const hasValue = MEASURE_FIELDS.some((f) => normalizeValue(row[f]) !== "");
    if (!hasValue) return false;
    if (isRowDirty(row, baseline[s.student_id])) return true;
    return changedAreas.some(
      (a) => normalizeValue(row[AREA_VALUE_FIELD[a]]) !== ""
    );
  });
