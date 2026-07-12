import { calcBMI, calcBMIGrade } from "./bmiCalc";
import { calcScore, calcBmiScore, calcTotalScore, totalGradeFromScore } from "./papsScore";

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

/**
 * 측정값 + 학생정보 + gradesData → 완전한 등급 객체 생성
 *
 * @param {object} formValues  cardio_type/value, muscle_type/value, flexibility_value, agility_type/value
 * @param {object} student     grade, gender (+ height/weight — BMI 산출용)
 * @param {Array}  gradesData  grades_standard 시트 데이터
 * @param {object} [options]
 * @param {number|null} [options.bmi] 지정 시 height/weight로 재계산하지 않고 이 BMI를 사용
 *                                    (설정 → 재계산: 측정 당시 BMI 이력 보존용)
 * @param {string} [options.schoolLevel] 초등학교/중학교/고등학교 — BMI 공식 기준표 조회용.
 *                                       미지정 시 BMI 등급 미산출(null)
 */
export const buildGrades = (formValues, student, gradesData, options = {}) => {
  if (!gradesData || !student) return null;
  const bmi = "bmi" in options ? options.bmi : calcBMI(student.height, student.weight);
  const bmi_grade = calcBMIGrade(bmi, {
    schoolLevel: options.schoolLevel,
    grade: student.grade,
    gender: student.gender,
  });

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

  // 종합등급 — PAPS 공식 점수제(기록→점수 0~20 합산 총점 기준). 기록시트지와 동일한 산출.
  // schoolLevel 미지정(점수표 조회 불가) 시 기존 영역 등급 평균 방식으로 폴백.
  if (options.schoolLevel) {
    const ctx = { schoolLevel: options.schoolLevel, grade: student.grade, gender: student.gender };
    const cardio_score = calcScore(formValues.cardio_value, formValues.cardio_type, ctx);
    const muscle_score = calcScore(formValues.muscle_value, formValues.muscle_type, ctx);
    const flexibility_score = calcScore(formValues.flexibility_value, "sit_and_reach", ctx);
    const agility_score = calcScore(formValues.agility_value, formValues.agility_type, ctx);
    const bmi_score = calcBmiScore(bmi, ctx);
    const total_score = calcTotalScore([cardio_score, muscle_score, flexibility_score, agility_score, bmi_score]);
    return {
      bmi, bmi_grade, cardio_grade, muscle_grade, flexibility_grade, agility_grade,
      cardio_score, muscle_score, flexibility_score, agility_score, bmi_score, total_score,
      total_grade: totalGradeFromScore(total_score),
    };
  }

  const total_grade = calcTotalGrade([
    cardio_grade, muscle_grade, flexibility_grade, agility_grade, bmi_grade,
  ]);
  return { bmi, bmi_grade, cardio_grade, muscle_grade, flexibility_grade, agility_grade, total_grade };
};
