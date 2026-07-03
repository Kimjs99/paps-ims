import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "../store/settingsStore";
import { sheetsRequest } from "../api/sheetsClient";
import { SHEET_NAMES } from "../constants/paps";
import { buildGrades } from "../utils/gradeCalc";

// grades_standard 시트 조회 (staleTime 5분)
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
        higher_is_better: String(row[8]).toLowerCase() === "true",
      }));
    },
    enabled: !!sheetId,
    staleTime: 5 * 60 * 1000,
  });
};

// 입력값 변경 시 실시간 등급 계산 — buildGrades 위임 (StudentMeasure 미리보기·저장 경로)
export const useCalculateGrades = (formValues, student) => {
  const { data: gradesData } = useGradesStandard();
  const schoolLevel = useSettingsStore((s) => s.schoolLevel);
  return buildGrades(formValues, student, gradesData, { schoolLevel });
};
