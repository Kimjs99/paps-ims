import { useState, useMemo } from "react";
import {
  FileText,
  User,
  Table,
  Download,
  Printer,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useMeasurements, useStudents } from "../../hooks/useSheets";
import { deduplicateMeasurements } from "../../hooks/useDashboard";
import { useSettingsStore } from "../../store/settingsStore";
import { ClassReportPreview } from "../../components/report/ClassReportPreview";
import { PersonalGrowthCard } from "../../components/report/PersonalGrowthCard";
import { RawDataExport } from "../../components/report/RawDataExport";
import { exportMultiPagePdf, exportAllPersonalCards } from "../../utils/pdfExport";

const REPORT_GRADE_KEYS = ["cardio_grade", "muscle_grade", "flexibility_grade", "agility_grade", "bmi_grade"];

const TABS = [
  { id: "class", label: "학급 보고서", Icon: FileText },
  { id: "personal", label: "개인 성장 카드", Icon: User },
  { id: "raw", label: "원시 데이터", Icon: Table },
];

export default function Report() {
  const [activeTab, setActiveTab] = useState("class");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: measurements = [], isLoading: mLoading } = useMeasurements();
  const { data: students = [], isLoading: sLoading } = useStudents();
  const { schoolName, schoolYear, teacherName } = useSettingsStore();
  const isLoading = mLoading || sLoading;

  // 활성 학생
  const activeStudents = useMemo(() => students.filter((s) => s.is_active), [students]);

  // deduped 측정값
  const deduped = useMemo(() => {
    const ids = new Set(activeStudents.map((s) => s.student_id));
    return deduplicateMeasurements(measurements.filter((m) => ids.has(m.student_id)));
  }, [measurements, activeStudents]);

  // 사용 가능한 연도 목록
  const availableYears = useMemo(() => {
    const years = [...new Set(deduped.map((m) => m.year).filter(Boolean))];
    return years.sort((a, b) => b - a);
  }, [deduped]);

  // 반 목록 (학년 필터 반영)
  const availableClasses = useMemo(() => {
    let s = activeStudents;
    if (filterGrade) s = s.filter((st) => String(st.grade) === filterGrade);
    const classes = [...new Set(s.map((st) => st.class).filter(Boolean))];
    return classes.sort((a, b) => Number(a) - Number(b));
  }, [activeStudents, filterGrade]);

  // 필터 적용된 측정 데이터 (deduped — 카운트 표시용)
  const filteredMeasurements = useMemo(() => {
    let m = deduped;
    if (filterYear) m = m.filter((x) => String(x.year) === filterYear);
    if (filterGrade || filterClass) {
      m = m.filter((x) => {
        const s = activeStudents.find((st) => st.student_id === x.student_id);
        if (!s) return false;
        if (filterGrade && String(s.grade) !== filterGrade) return false;
        if (filterClass && String(s.class) !== filterClass) return false;
        return true;
      });
    }
    return m;
  }, [deduped, activeStudents, filterYear, filterGrade, filterClass]);

  // 보고서용: 원시 측정값에서 학생별 평균 등급 산출 (최우수 병합 없음)
  const reportMeasurements = useMemo(() => {
    let raw = measurements;
    if (filterYear) raw = raw.filter((m) => String(m.year) === filterYear);
    if (filterGrade || filterClass) {
      raw = raw.filter((m) => {
        const s = activeStudents.find((st) => st.student_id === m.student_id);
        if (!s) return false;
        if (filterGrade && String(s.grade) !== filterGrade) return false;
        if (filterClass && String(s.class) !== filterClass) return false;
        return true;
      });
    }
    const groups = new Map();
    raw.forEach((m) => {
      if (!groups.has(m.student_id)) groups.set(m.student_id, []);
      groups.get(m.student_id).push(m);
    });
    return Array.from(groups.entries()).map(([student_id, records]) => {
      const result = { student_id };
      REPORT_GRADE_KEYS.forEach((key) => {
        const vals = records.map((r) => Number(r[key])).filter((v) => v >= 1 && v <= 5);
        result[key] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      });
      const totals = records.map((r) => Number(r.total_grade)).filter((v) => v >= 1 && v <= 5);
      result.total_grade = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
      return result;
    });
  }, [measurements, activeStudents, filterYear, filterGrade, filterClass]);

  // 필터 적용된 학생 목록
  const filteredStudents = useMemo(() => {
    let s = activeStudents;
    if (filterGrade) s = s.filter((st) => String(st.grade) === filterGrade);
    if (filterClass) s = s.filter((st) => String(st.class) === filterClass);
    return s;
  }, [activeStudents, filterGrade, filterClass]);

  // className 레이블
  const classLabel = useMemo(() => {
    const parts = [];
    if (filterGrade) parts.push(`${filterGrade}학년`);
    if (filterClass) parts.push(`${filterClass}반`);
    if (filterYear) parts.push(`${filterYear}년도`);
    return parts.length > 0 ? parts.join(" ") : "전체";
  }, [filterGrade, filterClass, filterYear]);

  // 학급 보고서 PDF 내보내기
  const handleClassPdfExport = async () => {
    setIsExporting(true);
    try {
      await exportMultiPagePdf(
        ["report-page-1", "report-page-2"],
        `PAPS_학급보고서_${classLabel}.pdf`
      );
    } catch (e) {
      alert("PDF 내보내기 실패: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 학급 보고서 인쇄
  const handlePrint = () => window.print();

  // 개인 카드 — 선택한 학생 단일 PDF
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const selectedStudent = useMemo(
    () => filteredStudents.find((s) => s.student_id === selectedStudentId) || null,
    [filteredStudents, selectedStudentId]
  );
  const selectedStudentMeasurements = useMemo(
    () => measurements.filter((m) => m.student_id === selectedStudentId),
    [measurements, selectedStudentId]
  );

  const handleSingleCardExport = async () => {
    if (!selectedStudent) return;
    setIsExporting(true);
    try {
      const { exportElementToPdf } = await import("../../utils/pdfExport");
      await exportElementToPdf(
        `card-${selectedStudentId}`,
        `PAPS_체력카드_${selectedStudent.name}.pdf`
      );
    } catch (e) {
      alert("PDF 내보내기 실패: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 학급 전체 개인 카드 일괄 PDF
  const [batchStudents, setBatchStudents] = useState([]);
  const [isBatchRendering, setIsBatchRendering] = useState(false);

  const handleBatchCardExport = async () => {
    if (filteredStudents.length === 0) return;
    setIsBatchRendering(true);
    setBatchStudents(filteredStudents);
    // DOM 렌더 대기
    await new Promise((r) => setTimeout(r, 300));
    setIsExporting(true);
    try {
      await exportAllPersonalCards(
        filteredStudents.map((s) => s.student_id),
        (id) => `batch-card-${id}`,
        `PAPS_체력카드_${classLabel}_전체.pdf`,
        setProgress
      );
    } catch (e) {
      alert("일괄 PDF 실패: " + e.message);
    } finally {
      setIsExporting(false);
      setIsBatchRendering(false);
      setBatchStudents([]);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-5 print-hidden">
      {/* 타이틀 */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">보고서 & 내보내기</h1>
        <p className="text-sm text-gray-500 mt-1">학급 보고서, 개인 성장 카드, Excel 데이터를 내보냅니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* 공통 필터 (원시 데이터 탭 제외) */}
      {activeTab !== "raw" && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">필터</h3>
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterGrade}
              onChange={(e) => { setFilterGrade(e.target.value); setFilterClass(""); }}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 학년</option>
              {[1, 2, 3].map((g) => <option key={g} value={g}>{g}학년</option>)}
            </select>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 반</option>
              {availableClasses.map((c) => <option key={c} value={c}>{c}반</option>)}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 연도</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <div className="flex items-center text-sm text-gray-500">
              <ChevronRight size={14} />
              <span>
                {filteredMeasurements.length}건 측정 / {filteredStudents.length}명 대상
              </span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> 데이터 로딩 중...
        </div>
      ) : (
        <>
          {/* ─── 학급 보고서 탭 ─── */}
          {activeTab === "class" && (
            <div className="space-y-4">
              {/* 내보내기 버튼 */}
              <div className="flex gap-3 print-hidden">
                <button
                  onClick={handleClassPdfExport}
                  disabled={isExporting || filteredMeasurements.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  PDF 저장
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <Printer size={15} />
                  인쇄
                </button>
              </div>

              {/* 미리보기 */}
              <div className="overflow-auto border rounded-xl bg-gray-100 p-4">
                <div className="shadow-sm mx-auto" style={{ width: "fit-content" }}>
                  <ClassReportPreview
                    measurements={reportMeasurements}
                    students={activeStudents}
                    schoolName={schoolName}
                    schoolYear={filterYear || schoolYear}
                    className={classLabel}
                    teacherName={teacherName}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── 개인 성장 카드 탭 ─── */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              {/* 학생 선택 */}
              <div className="bg-white rounded-xl border p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">개인 카드 내보내기</h3>

                <div className="flex gap-3 flex-wrap items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">학생 선택</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-40"
                    >
                      <option value="">-- 학생 선택 --</option>
                      {filteredStudents
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .map((s) => (
                          <option key={s.student_id} value={s.student_id}>
                            {s.grade}학년 {s.class}반 {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSingleCardExport}
                    disabled={!selectedStudentId || isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    단일 PDF
                  </button>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      현재 필터 ({classLabel}) 전체 {filteredStudents.length}명 일괄 PDF
                    </span>
                    <button
                      onClick={handleBatchCardExport}
                      disabled={filteredStudents.length === 0 || isExporting || isBatchRendering}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          {progress}% 처리 중...
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          일괄 PDF
                        </>
                      )}
                    </button>
                  </div>
                  {isExporting && (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 단일 카드 미리보기 */}
              {selectedStudent && (
                <div className="overflow-auto border rounded-xl bg-gray-100 p-4">
                  <div className="mx-auto" style={{ width: "fit-content" }}>
                    <PersonalGrowthCard
                      id={`card-${selectedStudent.student_id}`}
                      student={selectedStudent}
                      measurements={selectedStudentMeasurements}
                      schoolName={schoolName}
                      schoolYear={filterYear || schoolYear}
                    />
                  </div>
                </div>
              )}
              {!selectedStudentId && (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                  학생을 선택하면 미리보기가 표시됩니다.
                </div>
              )}
            </div>
          )}

          {/* ─── 원시 데이터 탭 ─── */}
          {activeTab === "raw" && (
            <div className="bg-white rounded-xl border p-6">
              <RawDataExport measurements={deduped} students={activeStudents} />
            </div>
          )}
        </>
      )}

      {/* 일괄 카드 생성 시 오프스크린 렌더링 */}
      {isBatchRendering && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          {batchStudents.map((s) => (
            <PersonalGrowthCard
              key={s.student_id}
              id={`batch-card-${s.student_id}`}
              student={s}
              measurements={measurements.filter((m) => m.student_id === s.student_id)}
              schoolName={schoolName}
              schoolYear={filterYear || schoolYear}
            />
          ))}
        </div>
      )}

      {/* 인쇄 전용 영역 */}
      <div className="print-only hidden">
        {activeTab === "class" && (
          <ClassReportPreview
            measurements={reportMeasurements}
            students={activeStudents}
            schoolName={schoolName}
            schoolYear={filterYear || schoolYear}
            className={classLabel}
            teacherName={teacherName}
          />
        )}
      </div>
    </div>
  );
}
