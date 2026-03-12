import * as XLSX from "xlsx";

// 원시 데이터 Excel 내보내기
export const exportMeasurementsToExcel = (
  measurements,
  students,
  filename = "PAPS_data.xlsx"
) => {
  const rows = measurements.map((m) => {
    const s = students.find((st) => st.student_id === m.student_id) || {};
    return {
      "학번": m.student_id,
      "이름": s.name || "",
      "학년": s.grade || "",
      "반": s.class || "",
      "성별": s.gender === "M" ? "남" : "여",
      "측정연도": m.year,
      "심폐지구력 종목": m.cardio_type || "",
      "심폐지구력 값": m.cardio_value,
      "심폐지구력 등급": m.cardio_grade,
      "근력근지구력 종목": m.muscle_type || "",
      "근력근지구력 값": m.muscle_value,
      "근력근지구력 등급": m.muscle_grade,
      "유연성 값(cm)": m.flexibility_value,
      "유연성 등급": m.flexibility_grade,
      "순발력 종목": m.agility_type || "",
      "순발력 값": m.agility_value,
      "순발력 등급": m.agility_grade,
      "BMI": m.bmi,
      "BMI 등급": m.bmi_grade,
      "종합 등급": m.total_grade,
      "측정일시": m.measured_at,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "측정결과");

  const studentRows = students.map((s) => ({
    "학번": s.student_id,
    "이름": s.name,
    "학년": s.grade,
    "반": s.class,
    "성별": s.gender === "M" ? "남" : "여",
    "키(cm)": s.height,
    "몸무게(kg)": s.weight,
  }));
  const ws2 = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(wb, ws2, "학생정보");

  XLSX.writeFile(wb, filename);
};

// 학급별 요약 Excel
export const exportClassSummaryToExcel = (classData, className, filename) => {
  const ws = XLSX.utils.json_to_sheet(classData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, className);
  XLSX.writeFile(wb, filename || `${className}_PAPS_요약.xlsx`);
};
