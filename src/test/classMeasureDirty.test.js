import { describe, it, expect } from "vitest";
import {
  MEASURE_FIELDS,
  normalizeValue,
  buildBaseline,
  isRowDirty,
  selectDirtyStudents,
} from "../pages/app/classMeasureDirty";

const students = [
  { student_id: "s1", name: "김하나", grade: 1, class: 1, height: 165, weight: 60 },
  { student_id: "s2", name: "이둘", grade: 1, class: 1 }, // 키/몸무게 미등록
  { student_id: "s3", name: "박셋", grade: 1, class: 1, height: 170, weight: 65 },
];

const existing = {
  s1: {
    measurement_id: "m1",
    student_id: "s1",
    cardio_value: 50,
    muscle_value: 30,
    flexibility_value: 10,
    agility_value: 8.5,
  },
  // s2, s3는 기존 측정 없음
};

describe("normalizeValue", () => {
  it('빈 값("", null, undefined)은 모두 ""로 정규화', () => {
    expect(normalizeValue("")).toBe("");
    expect(normalizeValue(null)).toBe("");
    expect(normalizeValue(undefined)).toBe("");
  });

  it("숫자와 동일한 문자열은 같은 값으로 정규화 (시트 숫자 vs 폼 문자열)", () => {
    expect(normalizeValue(165)).toBe(normalizeValue("165"));
    expect(normalizeValue(8.5)).toBe(normalizeValue("8.5"));
    expect(normalizeValue(0)).toBe("0"); // 0은 빈 값이 아님
  });
});

describe("buildBaseline", () => {
  it("학생 키/몸무게 + 기존 측정값으로 스냅샷 생성", () => {
    const baseline = buildBaseline(students, existing);
    expect(baseline.s1).toEqual({
      height: 165,
      weight: 60,
      cardio_value: 50,
      muscle_value: 30,
      flexibility_value: 10,
      agility_value: 8.5,
    });
  });

  it("기존 측정·신체 정보 없는 학생은 전 필드 빈 문자열", () => {
    const baseline = buildBaseline(students, existing);
    expect(baseline.s2).toEqual({
      height: "",
      weight: "",
      cardio_value: "",
      muscle_value: "",
      flexibility_value: "",
      agility_value: "",
    });
  });

  it("existingMeasurements 생략 시에도 동작", () => {
    const baseline = buildBaseline(students);
    expect(baseline.s1.cardio_value).toBe("");
    expect(baseline.s1.height).toBe(165);
  });
});

describe("isRowDirty", () => {
  const baseline = buildBaseline(students, existing);

  it("폼 행이 없으면(미초기화) dirty 아님", () => {
    expect(isRowDirty(undefined, baseline.s1)).toBe(false);
    expect(isRowDirty(null, baseline.s1)).toBe(false);
  });

  it("프리필 그대로(숫자↔문자열 차이만)면 dirty 아님", () => {
    const row = {
      height: "165",
      weight: "60",
      cardio_value: "50",
      muscle_value: "30",
      flexibility_value: "10",
      agility_value: "8.5",
    };
    expect(isRowDirty(row, baseline.s1)).toBe(false);
  });

  it("필드 하나라도 바뀌면 dirty", () => {
    const row = { ...baseline.s1, cardio_value: "55" };
    expect(isRowDirty(row, baseline.s1)).toBe(true);
  });

  it("기존 값을 비운 것도 dirty", () => {
    const row = { ...baseline.s1, flexibility_value: "" };
    expect(isRowDirty(row, baseline.s1)).toBe(true);
  });

  it("스냅샷이 없는 학생(baseline 미존재)은 값 입력 시 dirty", () => {
    expect(isRowDirty({ cardio_value: "40" }, undefined)).toBe(true);
  });
});

describe("selectDirtyStudents", () => {
  const baseline = buildBaseline(students, existing);

  it("전원 무변경(프리필 그대로)이면 빈 배열 — 중복 append 방지", () => {
    const formValues = {
      s1: { ...baseline.s1 },
      s2: { ...baseline.s2 },
      s3: { ...baseline.s3 },
    };
    expect(selectDirtyStudents(students, formValues, baseline)).toEqual([]);
  });

  it("변경된 학생만 선별", () => {
    const formValues = {
      s1: { ...baseline.s1 }, // 무변경
      s2: { ...baseline.s2, cardio_value: "45" }, // 신규 입력
      s3: { ...baseline.s3 }, // 무변경 (전 필드 빈 값 아님: height/weight 프리필)
    };
    const result = selectDirtyStudents(students, formValues, baseline);
    expect(result.map((s) => s.student_id)).toEqual(["s2"]);
  });

  it("폼 행이 없는 학생은 제외", () => {
    expect(selectDirtyStudents(students, {}, baseline)).toEqual([]);
  });

  it("전 필드를 비운 행은 dirty여도 저장 대상 제외 (기존 '값이 하나라도 있는 학생' 규칙 유지)", () => {
    const emptyRow = Object.fromEntries(MEASURE_FIELDS.map((f) => [f, ""]));
    const formValues = { s1: emptyRow };
    expect(selectDirtyStudents(students, formValues, baseline)).toEqual([]);
  });

  it("일부 필드만 비우고 다른 값이 남아 있으면 저장 대상", () => {
    const formValues = { s1: { ...baseline.s1, muscle_value: "" } };
    const result = selectDirtyStudents(students, formValues, baseline);
    expect(result.map((s) => s.student_id)).toEqual(["s1"]);
  });

  it("키/몸무게만 변경돼도 저장 대상 (updateStudent + BMI 재계산 경로)", () => {
    const formValues = { s1: { ...baseline.s1, height: "166" } };
    const result = selectDirtyStudents(students, formValues, baseline);
    expect(result.map((s) => s.student_id)).toEqual(["s1"]);
  });

  it("localStorage draft 복원값(서버와 다른 미저장 입력)은 dirty로 판정", () => {
    // draft: 이전 세션에서 입력하다 만 값 — 스냅샷(서버값)과 다르므로 저장 대상
    const formValues = { s1: { ...baseline.s1, agility_value: "9.1" } };
    const result = selectDirtyStudents(students, formValues, baseline);
    expect(result.map((s) => s.student_id)).toEqual(["s1"]);
  });

  it("값 무변경이어도 종목(changedAreas)이 바뀌면 해당 영역 값이 있는 행은 저장 대상", () => {
    // 잘못된 종목으로 저장 후 종목 Select만 고쳐 재저장하는 시나리오 — 등급 재계산 필요
    const formValues = {
      s1: { ...baseline.s1 }, // cardio_value 50 보유
      s2: { ...baseline.s2 }, // 전 필드 빈 값
    };
    const result = selectDirtyStudents(students, formValues, baseline, ["cardio"]);
    expect(result.map((s) => s.student_id)).toEqual(["s1"]);
  });

  it("종목이 바뀌어도 해당 영역 값이 빈 행은 제외", () => {
    // s1은 cardio_value만 비어 있고 muscle_value는 있음 → cardio 종목 변경과 무관
    const formValues = {
      s1: { ...baseline.s1, cardio_value: "" },
    };
    // cardio_value를 비운 것 자체가 dirty이므로, 종목 변경 무관 케이스는 baseline도 빈 값으로 맞춘다
    const emptyCardioBaseline = {
      ...baseline,
      s1: { ...baseline.s1, cardio_value: "" },
    };
    expect(
      selectDirtyStudents(students, formValues, emptyCardioBaseline, ["cardio"])
    ).toEqual([]);
    // 반면 muscle 종목이 바뀌면 muscle_value(30)가 있으므로 저장 대상
    expect(
      selectDirtyStudents(students, formValues, emptyCardioBaseline, ["muscle"]).map(
        (s) => s.student_id
      )
    ).toEqual(["s1"]);
  });

  it("changedAreas 생략 시 기존 동작과 동일", () => {
    const formValues = { s1: { ...baseline.s1 } };
    expect(selectDirtyStudents(students, formValues, baseline)).toEqual([]);
  });
});
