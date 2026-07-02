// 학급 보고서 탭 — Report.jsx에서 분리 (내보내기 버튼 + 미리보기, props 기반)
import { Download, Printer, Loader2 } from "lucide-react";
import { ClassReportPreview } from "./ClassReportPreview";

export function ClassReportTab({
  onPdfExport, onPrint, isExporting, exportDisabled,
  measurements, students, schoolName, schoolYear, className, teacherName,
}) {
  return (
    <div className="space-y-4">
      {/* 내보내기 버튼 */}
      <div className="flex gap-3 print-hidden">
        <button
          onClick={onPdfExport}
          disabled={isExporting || exportDisabled}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          PDF 저장
        </button>
        <button
          onClick={onPrint}
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
            measurements={measurements}
            students={students}
            schoolName={schoolName}
            schoolYear={schoolYear}
            className={className}
            teacherName={teacherName}
          />
        </div>
      </div>
    </div>
  );
}
