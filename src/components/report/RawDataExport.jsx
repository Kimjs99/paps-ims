import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import { exportMeasurementsToExcel } from "../../utils/excelExport";
import { deduplicateMeasurements } from "../../hooks/useDashboard";
import { useSettingsStore } from "../../store/settingsStore";

export function RawDataExport({ measurements, students }) {
  const { schoolName, schoolYear } = useSettingsStore();

  const [targetGrade, setTargetGrade] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [selectedYears, setSelectedYears] = useState([]);
  const [includeStudentInfo, setIncludeStudentInfo] = useState(true);
  const [filename, setFilename] = useState(
    `PAPS_${schoolName || "학교"}_${schoolYear}.xlsx`
  );

  const activeStudents = useMemo(
    () => students.filter((s) => s.is_active),
    [students]
  );

  const availableYears = useMemo(() => {
    const ids = new Set(activeStudents.map((s) => s.student_id));
    const years = [...new Set(measurements.filter((m) => ids.has(m.student_id)).map((m) => m.year).filter(Boolean))];
    return years.sort((a, b) => b - a);
  }, [measurements, activeStudents]);

  const availableClasses = useMemo(() => {
    let s = activeStudents;
    if (targetGrade) s = s.filter((st) => String(st.grade) === targetGrade);
    const classes = [...new Set(s.map((st) => st.class).filter(Boolean))];
    return classes.sort((a, b) => Number(a) - Number(b));
  }, [activeStudents, targetGrade]);

  const toggleYear = (year) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleExport = () => {
    // 필터 적용
    let filteredStudents = activeStudents;
    if (targetGrade) filteredStudents = filteredStudents.filter((s) => String(s.grade) === targetGrade);
    if (targetClass) filteredStudents = filteredStudents.filter((s) => String(s.class) === targetClass);

    const studentIds = new Set(filteredStudents.map((s) => s.student_id));

    let deduped = deduplicateMeasurements(
      measurements.filter((m) => studentIds.has(m.student_id))
    );
    if (selectedYears.length > 0) {
      deduped = deduped.filter((m) => selectedYears.includes(m.year));
    }

    const exportStudents = includeStudentInfo ? filteredStudents : [];
    exportMeasurementsToExcel(deduped, exportStudents, filename || "PAPS_data.xlsx");
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-700">내보내기 옵션</h3>

      {/* 대상 선택 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">학년</label>
          <select
            value={targetGrade}
            onChange={(e) => { setTargetGrade(e.target.value); setTargetClass(""); }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 학년</option>
            {[1, 2, 3].map((g) => (
              <option key={g} value={g}>{g}학년</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">반</label>
          <select
            value={targetClass}
            onChange={(e) => setTargetClass(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 반</option>
            {availableClasses.map((c) => (
              <option key={c} value={c}>{c}반</option>
            ))}
          </select>
        </div>
      </div>

      {/* 측정연도 선택 (다중) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          측정연도 <span className="text-gray-400">(미선택 시 전체)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedYears.includes(year)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              {year}년
            </button>
          ))}
          {availableYears.length === 0 && (
            <span className="text-sm text-gray-400">연도 데이터 없음</span>
          )}
        </div>
      </div>

      {/* 학생 정보 포함 여부 */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={includeStudentInfo}
          onChange={(e) => setIncludeStudentInfo(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
        <span className="text-sm text-gray-700">학생 정보 시트 포함</span>
        <span className="text-xs text-gray-400">(학번, 이름, 학년, 반, 성별, 키, 몸무게)</span>
      </label>

      {/* 파일명 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">파일명</label>
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="PAPS_data.xlsx"
        />
      </div>

      {/* 내보내기 버튼 */}
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        <Download size={16} />
        Excel 다운로드
      </button>
    </div>
  );
}
