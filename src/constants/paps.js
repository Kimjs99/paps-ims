// 측정 항목 정의
export const CARDIO_TYPES = [
  { value: "shuttle_run", label: "왕복오래달리기", unit: "회" },
  { value: "endurance_run", label: "오래달리기-걷기", unit: "분:초" },
  { value: "step_test", label: "스텝검사", unit: "점수" },
];

export const MUSCLE_TYPES = [
  { value: "sit_up", label: "윗몸말아올리기", unit: "회" },
  { value: "grip_strength", label: "악력", unit: "kg" },
];

export const AGILITY_TYPES = [
  { value: "sprint_50m", label: "50m 달리기", unit: "초" },
  { value: "standing_jump", label: "제자리멀리뛰기", unit: "cm" },
];

export const FLEXIBILITY_ITEM = {
  value: "sit_and_reach",
  label: "앉아윗몸앞으로굽히기",
  unit: "cm",
};

// 5개 체력요소 정의 (등급/값/종목 필드 키 포함) — 영역 배열을 재선언하지 말고 이 상수를 사용
// label: 기본 표기("BMI"), labelAlt: "비만" 표기 사이트용, labelFull: "비만(BMI)" 표기 사이트용
// (표시 문구가 화면마다 다르므로 각 사이트는 자기 표기의 필드를 선택해 사용 — 렌더 텍스트 변경 금지)
export const FITNESS_AREAS = [
  { key: "cardio",      label: "심폐지구력",    gradeField: "cardio_grade",      valueField: "cardio_value",      typeField: "cardio_type" },
  { key: "muscle",      label: "근력·근지구력", gradeField: "muscle_grade",      valueField: "muscle_value",      typeField: "muscle_type" },
  { key: "flexibility", label: "유연성",        gradeField: "flexibility_grade", valueField: "flexibility_value" },
  { key: "agility",     label: "순발력",        gradeField: "agility_grade",     valueField: "agility_value",     typeField: "agility_type" },
  { key: "bmi",         label: "BMI", labelAlt: "비만", labelFull: "비만(BMI)", gradeField: "bmi_grade", valueField: "bmi" },
];

// 5개 영역 등급 필드 키 목록 (cardio_grade ... bmi_grade)
export const FITNESS_GRADE_FIELDS = FITNESS_AREAS.map((a) => a.gradeField);

// 등급 색상
export const GRADE_COLORS = {
  1: "#2563EB",
  2: "#16A34A",
  3: "#D97706",
  4: "#EA580C",
  5: "#DC2626",
};

export const GRADE_LABELS = {
  1: "최우수",
  2: "우수",
  3: "보통",
  4: "노력 필요",
  5: "매우 노력 필요",
};

// Sheets 스키마 버전
export const SCHEMA_VERSION = "1.0";

// Sheets 시트명
export const SHEET_NAMES = {
  STUDENTS: "students",
  MEASUREMENTS: "measurements",
  GRADES_STANDARD: "grades_standard",
  SETTINGS: "settings",
};

// 측정값 유효 범위 (이상값 감지용)
export const VALID_RANGES = {
  shuttle_run: { min: 0, max: 150 },
  endurance_run: { min: 300, max: 3600 }, // 오래달리기-걷기 — 단위: 초 (5분~60분)
  step_test: { min: 0, max: 100 },
  sit_up: { min: 0, max: 100 },
  grip_strength: { min: 0, max: 80 },
  sit_and_reach: { min: -20, max: 30 },
  sprint_50m: { min: 5, max: 30 },
  standing_jump: { min: 50, max: 350 },
  height: { min: 100, max: 220 },
  weight: { min: 20, max: 150 },
};
