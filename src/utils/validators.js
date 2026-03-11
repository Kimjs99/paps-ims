import { z } from "zod";

export const studentSchema = z.object({
  student_id: z.string().min(1, "학번을 입력하세요"),
  name: z.string().min(1, "이름을 입력하세요"),
  gender: z.enum(["M", "F"], { message: "성별을 선택하세요" }),
  grade: z.coerce.number().int().min(1).max(3),
  class: z.coerce.number().int().min(1).max(20),
  height: z.coerce.number().min(100, "100cm 이상").max(220, "220cm 이하"),
  weight: z.coerce.number().min(20, "20kg 이상").max(150, "150kg 이하"),
});

export const measurementSchema = z.object({
  cardio_type: z.string().optional(),
  cardio_value: z.coerce.number().nullable().optional(),
  muscle_type: z.string().optional(),
  muscle_value: z.coerce.number().nullable().optional(),
  flexibility_value: z.coerce.number().min(-20).max(30).nullable().optional(),
  agility_type: z.string().optional(),
  agility_value: z.coerce.number().nullable().optional(),
});
