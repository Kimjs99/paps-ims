import { useState, useMemo } from "react";
import { FileText, User, Table, Loader2 } from "lucide-react";
import { useMeasurements, useStudents } from "../../hooks/useSheets";
import { deduplicateMeasurements } from "../../hooks/useDashboard";
import { useReportExports } from "../../hooks/useReportExports";
import { useSettingsStore } from "../../store/settingsStore";
import { ClassReportPreview } from "../../components/report/ClassReportPreview";
import { PersonalGrowthCard } from "../../components/report/PersonalGrowthCard";
import { RawDataExport } from "../../components/report/RawDataExport";
import { ReportFilters } from "../../components/report/ReportFilters";
import { ClassReportTab } from "../../components/report/ClassReportTab";
import { PersonalCardsTab } from "../../components/report/PersonalCardsTab";
import {
  filterMeasurements, buildReportMeasurements,
  getAvailableYears, getAvailableClasses, filterStudents, buildClassLabel,
} from "./reportData";

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
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const { data: measurements = [], isLoading: mLoading } = useMeasurements();
  const { data: students = [], isLoading: sLoading } = useStudents();
  const { schoolName, schoolYear, teacherName } = useSettingsStore();
  const isLoading = mLoading || sLoading;

  // 활성 학생
  const activeStudents = useMemo(() => students.filter((s) => s.is_active), [students]);

  // deduped 측정값 (원시 데이터 탭·카운트 표시용 — 보고서 평균 계산에는 사용 금지)
  const deduped = useMemo(() => {
    const ids = new Set(activeStudents.map((s) => s.student_id));
    return deduplicateMeasurements(measurements.filter((m) => ids.has(m.student_id)));
  }, [measurements, activeStudents]);

  // 사용 가능한 연도 목록
  const availableYears = useMemo(() => getAvailableYears(deduped), [deduped]);

  // 반 목록 (학년 필터 반영)
  const availableClasses = useMemo(
    () => getAvailableClasses(activeStudents, filterGrade),
    [activeStudents, filterGrade]
  );

  // 필터 적용된 측정 데이터 (deduped — 카운트 표시용)
  const filteredMeasurements = useMemo(
    () => filterMeasurements(deduped, activeStudents, { filterYear, filterGrade, filterClass }),
    [deduped, activeStudents, filterYear, filterGrade, filterClass]
  );

  // 보고서용: 원시 측정값에서 학생별 평균 등급 산출 (최우수 병합 없음)
  const reportMeasurements = useMemo(
    () => buildReportMeasurements(measurements, activeStudents, { filterYear, filterGrade, filterClass }),
    [measurements, activeStudents, filterYear, filterGrade, filterClass]
  );

  // 필터 적용된 학생 목록
  const filteredStudents = useMemo(
    () => filterStudents(activeStudents, { filterGrade, filterClass }),
    [activeStudents, filterGrade, filterClass]
  );

  // className 레이블
  const classLabel = useMemo(
    () => buildClassLabel({ filterGrade, filterClass, filterYear }),
    [filterGrade, filterClass, filterYear]
  );

  // 개인 카드 — 선택한 학생
  const selectedStudent = useMemo(
    () => filteredStudents.find((s) => s.student_id === selectedStudentId) || null,
    [filteredStudents, selectedStudentId]
  );
  const selectedStudentMeasurements = useMemo(
    () => measurements.filter((m) => m.student_id === selectedStudentId),
    [measurements, selectedStudentId]
  );

  // PDF 내보내기 상태·핸들러 (학급 PDF / 단일 카드 / 일괄 카드)
  const {
    isExporting, progress, batchStudents, isBatchRendering,
    handleClassPdfExport, handleSingleCardExport, handleBatchCardExport,
  } = useReportExports({ classLabel, filteredStudents, selectedStudent, selectedStudentId });

  // 학급 보고서 인쇄
  const handlePrint = () => window.print();

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
        <ReportFilters
          filterGrade={filterGrade} setFilterGrade={setFilterGrade}
          filterClass={filterClass} setFilterClass={setFilterClass}
          filterYear={filterYear} setFilterYear={setFilterYear}
          availableClasses={availableClasses}
          availableYears={availableYears}
          measurementCount={filteredMeasurements.length}
          studentCount={filteredStudents.length}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> 데이터 로딩 중...
        </div>
      ) : (
        <>
          {/* ─── 학급 보고서 탭 ─── */}
          {activeTab === "class" && (
            <ClassReportTab
              onPdfExport={handleClassPdfExport}
              onPrint={handlePrint}
              isExporting={isExporting}
              exportDisabled={filteredMeasurements.length === 0}
              measurements={reportMeasurements}
              students={activeStudents}
              schoolName={schoolName}
              schoolYear={filterYear || schoolYear}
              className={classLabel}
              teacherName={teacherName}
            />
          )}

          {/* ─── 개인 성장 카드 탭 ─── */}
          {activeTab === "personal" && (
            <PersonalCardsTab
              filteredStudents={filteredStudents}
              classLabel={classLabel}
              selectedStudentId={selectedStudentId}
              setSelectedStudentId={setSelectedStudentId}
              selectedStudent={selectedStudent}
              selectedStudentMeasurements={selectedStudentMeasurements}
              onSingleExport={handleSingleCardExport}
              onBatchExport={handleBatchCardExport}
              isExporting={isExporting}
              isBatchRendering={isBatchRendering}
              progress={progress}
              schoolName={schoolName}
              schoolYear={filterYear || schoolYear}
            />
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
