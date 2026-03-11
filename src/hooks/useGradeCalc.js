import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "../store/settingsStore";
import { sheetsRequest } from "../api/sheetsClient";
import { SHEET_NAMES } from "../constants/paps";
import { calcGrade, calcTotalGrade } from "../utils/gradeCalc";
import { calcBMI, calcBMIGrade } from "../utils/bmiCalc";

// grades_standard 시트 조회 (staleTime 1시간)
export const useGradesStandard = () => {
  const sheetId = useSettingsStore((s) => s.sheetId);
  return useQuery({
    queryKey: ["grades_standard", sheetId],
    queryFn: async () => {
      const data = await sheetsRequest({
        path: `/${sheetId}/values/${SHEET_NAMES.GRADES_STANDARD}!A2:I`,
      });
      return (data.values || []).map((row) => ({
        grade_level: Number(row[0]),
        gender: row[1],
        item: row[2],
        grade1_min: Number(row[3]),
        grade2_min: Number(row[4]),
        grade3_min: Number(row[5]),
        grade4_min: Number(row[6]),
        grade5_min: Number(row[7]),
        higher_is_better: row[8] === "true",
      }));
    },
    enabled: !!sheetId,
    staleTime: 60 * 60 * 1000,
  });
};

// 입력값 변경 시 실시간 등급 계산
export const useCalculateGrades = (formValues, student) => {
  const { data: gradesData } = useGradesStandard();
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
