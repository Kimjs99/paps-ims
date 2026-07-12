// 학생 가져오기 마법사 순수 함수 — 임의 양식(기록시트지 등)의 그리드에서 헤더 탐지·컬럼 매핑·학생 후보 생성
// 컴포넌트(ImportWizardDialog)는 파일 I/O·UI만 담당하고 변환 로직은 전부 여기서 다룬다.
// 테스트: src/test/studentImport.test.js

import { normalizeGender } from "../../utils/csv";

// 매핑 대상 필드 정의 — keywords는 헤더 셀 텍스트 부분 일치용 (긴 키워드 우선 매칭)
export const IMPORT_FIELDS = [
  { key: "student_id", label: "학번", keywords: ["학번", "student_id"] },
  { key: "name", label: "이름", keywords: ["이름", "성명", "name"] },
  { key: "gender", label: "성별", keywords: ["성별", "남녀", "gender"] },
  { key: "grade", label: "학년", keywords: ["학년", "grade"] },
  { key: "class", label: "반", keywords: ["학급", "반", "class"] },
  { key: "number", label: "번호", keywords: ["출석번호", "번호", "no."] },
  { key: "height", label: "키(cm)", keywords: ["신장", "키", "height"] },
  { key: "weight", label: "몸무게(kg)", keywords: ["몸무게", "체중", "weight"] },
];

// 체력측정 기록 매핑 대상 — 종목 키워드로 영역 시작 컬럼을 찾고,
// 같은 영역 구간(1차·2차·점수·등급...) 안의 "최고" 컬럼을 기록값으로 우선 사용
export const MEASURE_FIELDS = [
  { key: "cardio_value", label: "심폐지구력 기록", keywords: ["심폐", "셔틀런", "왕복", "오래달리기", "스텝"] },
  { key: "muscle_value", label: "근력·근지구력 기록", keywords: ["근력", "악력", "윗몸", "팔굽혀"] },
  { key: "flexibility_value", label: "유연성 기록", keywords: ["유연성", "앉아윗몸"] },
  { key: "agility_value", label: "순발력 기록", keywords: ["순발력", "제자리", "50m"] },
];

// 헤더 셀 정규화: 공백·개행 제거 + 소문자 — "키\n(cm)" → "키(cm)"
const normalizeCell = (cell) => String(cell ?? "").replace(/\s+/g, "").toLowerCase();

// 셀 하나가 어떤 필드에 해당하는지 판정 (exact=2, 부분 일치=1, 없음=0)
const matchField = (cell) => {
  const c = normalizeCell(cell);
  if (!c) return null;
  let best = null;
  for (const field of IMPORT_FIELDS) {
    for (const kw of field.keywords) {
      const score = c === kw ? 2 : c.includes(kw) ? 1 : 0;
      if (score > 0 && (!best || score > best.score)) best = { key: field.key, score };
    }
    // exact 매칭이 나오면 더 볼 필요 없음
    if (best?.score === 2) break;
  }
  return best;
};

// 헤더 행의 셀 배열 → { 필드key: 컬럼인덱스 } 추정. 필드당 최고 점수 컬럼 하나만 배정.
export const guessMapping = (cells) => {
  const mapping = {};
  const scores = {};
  (cells || []).forEach((cell, idx) => {
    const m = matchField(cell);
    if (!m) return;
    if (!(m.key in mapping) || m.score > scores[m.key]) {
      mapping[m.key] = idx;
      scores[m.key] = m.score;
    }
  });
  return mapping;
};

// 그리드 상단 N행을 스캔해 매핑 필드 수가 가장 많은 행을 헤더로 추정.
// "이름" 매핑이 있고 총 2개 필드 이상일 때만 유효 — 못 찾으면 headerRow: -1
export const detectHeaderRow = (grid, { maxScan = 20 } = {}) => {
  let best = { headerRow: -1, mapping: {}, count: 0 };
  (grid || []).slice(0, maxScan).forEach((row, idx) => {
    const mapping = guessMapping(row);
    const count = Object.keys(mapping).length;
    if ("name" in mapping && count >= 2 && count > best.count) {
      best = { headerRow: idx, mapping, count };
    }
  });
  return { headerRow: best.headerRow, mapping: best.mapping };
};

// 체력측정 기록 컬럼 추정 — 기록시트지의 "유연성 1차/2차 → 최고" 구조 대응.
// 종목 키워드가 처음 나오는 컬럼부터 다른 종목(또는 키/체중/BMI/총점) 전까지를 그 종목 구간으로 보고,
// 구간 안에 "최고" 컬럼이 있으면 그 컬럼(최고 기록)을, 없으면 시작 컬럼(단일 기록)을 사용한다.
export const guessMeasurementMapping = (cells) => {
  const norm = (cells || []).map(normalizeCell);
  const matchArea = (c) => MEASURE_FIELDS.find((f) => f.keywords.some((kw) => c.includes(kw)))?.key;
  const isBoundary = (c) => ["키(", "신장", "체중", "몸무게", "bmi", "총점", "종합"].some((kw) => c.includes(kw)) || c === "키";
  const mapping = {};
  MEASURE_FIELDS.forEach((field) => {
    const start = norm.findIndex((c) => c && matchArea(c) === field.key);
    if (start < 0) return;
    let pick = start;
    for (let i = start + 1; i < norm.length; i++) {
      const c = norm[i];
      const area = matchArea(c);
      if ((area && area !== field.key) || isBoundary(c)) break; // 다른 영역 시작 → 구간 종료
      if (c.includes("최고")) { pick = i; break; }
    }
    mapping[field.key] = pick;
  });
  return mapping;
};

// 헤더 전체 텍스트에서 측정 종목 유형 추정 (앱 저장용 type 값)
export const guessTypes = (cells) => {
  const all = (cells || []).map(normalizeCell).join("|");
  return {
    cardioType: all.includes("스텝")
      ? "step_test"
      : !all.includes("셔틀런") && !all.includes("왕복") && all.includes("오래달리기")
        ? "endurance_run"
        : "shuttle_run",
    muscleType: all.includes("악력") ? "grip_strength" : "sit_up",
    agilityType: all.includes("제자리") ? "standing_jump" : "sprint_50m",
  };
};

// 양식 식별 서명 — 같은 양식(같은 헤더 구성) 재업로드 시 프리셋 자동 적용용
export const mappingSignature = (headerCells) =>
  (headerCells || []).map(normalizeCell).filter(Boolean).join("|");

const firstNumber = (v) => {
  const m = String(v ?? "").match(/\d+(\.\d+)?/);
  return m ? m[0] : "";
};

// 키/몸무게: 빈 값·0은 미입력으로 취급 (0 저장 금지 규칙과 일치)
const optionalMeasure = (v) => {
  const n = firstNumber(v);
  return n === "" || Number(n) === 0 ? "" : n;
};

// 체력측정 기록값: 음수 허용(유연성 -8.7cm 등), 0도 유효한 기록
const measureValue = (v) => String(v ?? "").match(/-?\d+(\.\d+)?/)?.[0] ?? "";

// 그리드 + 매핑 → 학생 후보/오류 목록 (Zod 검증 전 단계)
// opts: fallbackGrade/fallbackClass(컬럼 미매핑 시 수동 입력값), existingIds(중복 학번 Set)
export const buildImportRows = (grid, headerRow, mapping, opts = {}) => {
  const { fallbackGrade = "", fallbackClass = "", existingIds = new Set() } = opts;
  const candidates = [];
  const errors = [];
  const seenIds = new Set();
  const cell = (row, key) => (mapping[key] != null ? String(row[mapping[key]] ?? "").trim() : "");

  (grid || []).slice(headerRow + 1).forEach((row, i) => {
    const line = headerRow + 2 + i; // 원본 그리드 1-base 행 번호
    const name = cell(row, "name");
    if (!name) return; // 빈 행·이름 없는 행은 조용히 건너뜀
    if (normalizeCell(name) === "이름" || normalizeCell(name) === "성명") return; // 반복 헤더 행

    const genderRaw = cell(row, "gender");
    const gender = normalizeGender(genderRaw);
    if (genderRaw && !gender) {
      errors.push(`${line}행(${name}): 성별 "${genderRaw}"을(를) 인식할 수 없습니다 (남/여 또는 M/F로 입력)`);
      return;
    }

    const grade = firstNumber(cell(row, "grade")) || String(fallbackGrade);
    const cls = firstNumber(cell(row, "class")) || String(fallbackClass);

    let student_id = cell(row, "student_id");
    if (!student_id) {
      // 학번 미제공 시 생성: 학년 + 반(2자리) + 번호(2자리) — 1학년 1반 1번 → 10101
      if (!grade || !cls) {
        errors.push(`${line}행(${name}): 학번이 없고 학년/반 정보도 없어 학번을 생성할 수 없습니다`);
        return;
      }
      const number = firstNumber(cell(row, "number")) || String(i + 1);
      student_id = `${grade}${cls.padStart(2, "0")}${number.padStart(2, "0")}`;
    }

    if (seenIds.has(student_id)) {
      errors.push(`${line}행(${name}): 학번 ${student_id}이(가) 파일 내에서 중복됩니다`);
      return;
    }
    if (existingIds.has(student_id)) {
      errors.push(`${line}행(${name}): 학번 ${student_id}은(는) 이미 등록된 학생입니다`);
      return;
    }
    seenIds.add(student_id);

    candidates.push({
      line,
      data: {
        student_id,
        name,
        gender: gender ?? "",
        grade,
        class: cls,
        height: optionalMeasure(cell(row, "height")),
        weight: optionalMeasure(cell(row, "weight")),
      },
      // 체력측정 기록 (매핑된 컬럼만) — 학생 스키마와 분리해 측정 저장 경로로 전달
      measures: {
        cardio_value: measureValue(cell(row, "cardio_value")),
        muscle_value: measureValue(cell(row, "muscle_value")),
        flexibility_value: measureValue(cell(row, "flexibility_value")),
        agility_value: measureValue(cell(row, "agility_value")),
      },
    });
  });

  return { candidates, errors };
};
