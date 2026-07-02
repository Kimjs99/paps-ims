// ClassMeasure 측정 CSV 순수 함수 — 템플릿 생성·업로드 반영
// 컴포넌트 파일(ClassMeasure.jsx)에서 분리: DOM/파일 I/O(다운로드·FileReader)는 페이지가 담당하고
// 여기는 문자열/객체 변환만 다룬다. 테스트: src/test/classMeasureCsv.test.js
// CSV 컬럼 순서 계약(CLAUDE.md): student_id, 이름, 성별, 학년, 반, 키(cm), 몸무게(kg), 심폐, 근력, 유연성, 순발력

import { CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES } from "../../constants/paps";

const typeLabel = (types, value) => types.find((t) => t.value === value)?.label || value;

// 측정 CSV 템플릿 문자열 생성 (학급 학생 사전 입력, 측정값 열은 빈칸)
export const buildTemplateCsv = (classStudents, { cardioType, muscleType, agilityType }) => {
  const cardioLabel = typeLabel(CARDIO_TYPES, cardioType);
  const muscleLabel = typeLabel(MUSCLE_TYPES, muscleType);
  const agilityLabel = typeLabel(AGILITY_TYPES, agilityType);
  const header = `student_id,이름,성별,학년,반,키(cm),몸무게(kg),심폐지구력(${cardioLabel}),근력근지구력(${muscleLabel}),유연성(앉아윗몸앞으로굽히기cm),순발력(${agilityLabel})`;
  const rows = classStudents.map((s) =>
    [s.student_id, s.name, s.gender === "M" ? "남" : "여", s.grade, s.class,
      s.height ?? "", s.weight ?? "", "", "", "", ""].join(",")
  );
  return [header, ...rows].join("\n");
};

// 파싱된 CSV 행 배열(헤더 포함) → formValues 병합
// 빈 셀은 기존 폼 값 유지, student_id 없는 행은 무시
export const applyCsvToFormValues = (rows, formValues) => {
  const next = { ...formValues };
  rows.slice(1).forEach((cols) => {
    const [studentId, , , , , height, weight, cardio, muscle, flex, agility] = cols;
    if (!studentId) return;
    next[studentId] = {
      height: height !== "" ? height : (formValues[studentId]?.height ?? ""),
      weight: weight !== "" ? weight : (formValues[studentId]?.weight ?? ""),
      cardio_value: cardio !== "" ? cardio : (formValues[studentId]?.cardio_value ?? ""),
      muscle_value: muscle !== "" ? muscle : (formValues[studentId]?.muscle_value ?? ""),
      flexibility_value: flex !== "" ? flex : (formValues[studentId]?.flexibility_value ?? ""),
      agility_value: agility !== "" ? agility : (formValues[studentId]?.agility_value ?? ""),
    };
  });
  return next;
};
