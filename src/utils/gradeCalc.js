// grades_standard 시트 데이터를 기반으로 등급 계산
export const calcGrade = (value, item, grade, gender, gradesData) => {
  if (value === null || value === undefined || value === "") return null;

  const standard = gradesData.find(
    (s) => s.grade_level === grade && s.gender === gender && s.item === item
  );
  if (!standard) return null;

  const thresholds = [
    standard.grade1_min,
    standard.grade2_min,
    standard.grade3_min,
    standard.grade4_min,
    standard.grade5_min,
  ];

  if (standard.higher_is_better) {
    if (value >= thresholds[0]) return 1;
    if (value >= thresholds[1]) return 2;
    if (value >= thresholds[2]) return 3;
    if (value >= thresholds[3]) return 4;
    return 5;
  } else {
    if (value <= thresholds[0]) return 1;
    if (value <= thresholds[1]) return 2;
    if (value <= thresholds[2]) return 3;
    if (value <= thresholds[3]) return 4;
    return 5;
  }
};

// 종합 등급: 5개 영역 등급 평균 (소수점 첫째 자리 반올림)
export const calcTotalGrade = (grades) => {
  const valid = grades.filter((g) => g !== null && g !== undefined);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
};

import { calcBMI, calcBMIGrade } from "./bmiCalc";

// 측정값 + 학생정보 + gradesData → 완전한 등급 객체 생성
export const buildGrades = (formValues, student, gradesData) => {
  if (!gradesData || !student) return null;
  const bmi = calcBMI(student.height, student.weight);
  const bmi_grade = calcBMIGrade(bmi);

  const cardio_grade = calcGrade(
    formValues.cardio_value, formValues.cardio_type,
    student.grade, student.gender, gradesData
  );
  const muscle_grade = calcGrade(
    formValues.muscle_value, formValues.muscle_type,
    student.grade, student.gender, gradesData
  );
  const flexibility_grade = calcGrade(
    formValues.flexibility_value, "sit_and_reach",
    student.grade, student.gender, gradesData
  );
  const agility_grade = calcGrade(
    formValues.agility_value, formValues.agility_type,
    student.grade, student.gender, gradesData
  );
  const total_grade = calcTotalGrade([
    cardio_grade, muscle_grade, flexibility_grade, agility_grade, bmi_grade,
  ]);

  return { bmi, bmi_grade, cardio_grade, muscle_grade, flexibility_grade, agility_grade, total_grade };
};
