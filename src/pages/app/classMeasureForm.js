// ClassMeasure 폼 라이프사이클 순수 함수 — 프리필 병합·종목 복원·저장 행 구성
// 컴포넌트 파일(ClassMeasure.jsx)에서 분리: 단위 테스트 용이 + 페이지는 오케스트레이션만 유지.
// 테스트: src/test/classMeasureForm.test.js

import { v4 as uuidv4 } from "uuid";
import { buildGrades } from "../../utils/gradeCalc";

// 저장된 측정값 + 학생 키/몸무게를 폼에 병합 (localStorage 초안 있는 학생은 유지)
// - 초안 없는 학생: 학생 키/몸무게 + 기존 측정값으로 채움
// - 초안은 있지만 키/몸무게가 없는 학생: 학생 데이터로 보충 (초안 값 우선)
export const mergePrefillFormValues = (prev, students, existingMeasurements) => {
  const next = { ...prev };
  students.forEach((s) => {
    if (!next[s.student_id]) {
      const m = existingMeasurements[s.student_id];
      next[s.student_id] = {
        height: s.height ?? "",
        weight: s.weight ?? "",
        cardio_value: m?.cardio_value ?? "",
        muscle_value: m?.muscle_value ?? "",
        flexibility_value: m?.flexibility_value ?? "",
        agility_value: m?.agility_value ?? "",
      };
    } else if (next[s.student_id].height === undefined) {
      // draft는 있지만 키/몸무게가 없으면 학생 데이터로 채움
      next[s.student_id] = {
        height: s.height ?? "",
        weight: s.weight ?? "",
        ...next[s.student_id],
      };
    }
  });
  return next;
};

// 저장된 종목 타입 복원 (미저장 시 기본값이 기준선)
export const restoreTypes = (existingMeasurements) => {
  const first = Object.values(existingMeasurements)[0];
  return {
    cardio: first?.cardio_type || "shuttle_run",
    muscle: first?.muscle_type || "sit_up",
    agility: first?.agility_type || "sprint_50m",
  };
};

// 저장 대상 학생 → measurements 행 목록 (학급 공통 종목 + 폼 키/몸무게(미입력 시 학생 레코드) 기준 등급 계산)
export const buildMeasurementRows = (
  toBeSaved,
  formValues,
  { cardioType, muscleType, agilityType },
  { schoolYear, teacherEmail },
  gradesData
) =>
  toBeSaved.map((student) => {
    const v = formValues[student.student_id] || {};
    const cardio_value = v.cardio_value !== "" ? Number(v.cardio_value) : null;
    const muscle_value = v.muscle_value !== "" ? Number(v.muscle_value) : null;
    const flexibility_value = v.flexibility_value !== "" ? Number(v.flexibility_value) : null;
    const agility_value = v.agility_value !== "" ? Number(v.agility_value) : null;
    const height = v.height !== "" ? Number(v.height) : student.height;
    const weight = v.weight !== "" ? Number(v.weight) : student.weight;
    const grades = buildGrades(
      {
        cardio_type: cardioType, cardio_value,
        muscle_type: muscleType, muscle_value,
        flexibility_value,
        agility_type: agilityType, agility_value,
      },
      { ...student, height, weight },
      gradesData
    );
    return {
      measurement_id: uuidv4(),
      student_id: student.student_id,
      year: schoolYear,
      cardio_type: cardioType, cardio_value,
      muscle_type: muscleType, muscle_value,
      flexibility_value,
      agility_type: agilityType, agility_value,
      ...grades,
      teacher_email: teacherEmail,
      measured_grade: student.grade, // 측정 당시 학년 (스키마 v1.1 — 과거 연도 재계산 시 기준)
    };
  });
