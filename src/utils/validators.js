import { z } from "zod";
import { GRADE_RANGE_BY_LEVEL } from "./gradesStandardSeed";

const optionalHeight = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().min(100, "100cm 이상").max(220, "220cm 이하").optional()
);
const optionalWeight = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().min(20, "20kg 이상").max(150, "150kg 이하").optional()
);

// 학교급별 학생 스키마 팩토리 — 초등 1~6학년, 중·고 1~3학년
export const makeStudentSchema = (schoolLevel) => {
  const gradeRange = GRADE_RANGE_BY_LEVEL[schoolLevel] || GRADE_RANGE_BY_LEVEL["중학교"];
  const maxGrade = gradeRange[gradeRange.length - 1];
  return z.object({
    student_id: z.string().min(1, "학번을 입력하세요"),
    name: z.string().min(1, "이름을 입력하세요"),
    gender: z.enum(["M", "F"], { message: "성별을 선택하세요" }),
    grade: z.coerce
      .number()
      .int()
      .min(1, "1학년 이상")
      .max(maxGrade, `${maxGrade}학년 이하`),
    class: z.coerce.number().int().min(1).max(20),
    height: optionalHeight,
    weight: optionalWeight,
  });
};

// 기본 스키마 (중학교 기준 1~3학년) — 하위 호환용
export const studentSchema = makeStudentSchema("중학교");

export const measurementSchema = z.object({
  height: optionalHeight,
  weight: optionalWeight,
  cardio_type: z.string().optional(),
  cardio_value: z.coerce.number().nullable().optional(),
  muscle_type: z.string().optional(),
  muscle_value: z.coerce.number().nullable().optional(),
  flexibility_value: z.coerce.number().min(-20).max(30).nullable().optional(),
  agility_type: z.string().optional(),
  agility_value: z.coerce.number().nullable().optional(),
});
