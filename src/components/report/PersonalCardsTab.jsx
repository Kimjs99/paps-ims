// 개인 성장 카드 탭 — Report.jsx에서 분리 (학생 선택·단일/일괄 내보내기 UI + 단일 미리보기)
// 선택/내보내기 상태와 핸들러는 페이지가 보유 (isExporting은 탭 간 공유, 일괄 렌더는 페이지 루트에서 수행)
import { Download, Loader2 } from "lucide-react";
import { PersonalGrowthCard } from "./PersonalGrowthCard";

export function PersonalCardsTab({
  filteredStudents, classLabel,
  selectedStudentId, setSelectedStudentId,
  selectedStudent, selectedStudentMeasurements,
  onSingleExport, onBatchExport,
  isExporting, isBatchRendering, progress,
  schoolName, schoolYear,
}) {
  return (
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
            onClick={onSingleExport}
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
              onClick={onBatchExport}
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
              schoolYear={schoolYear}
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
  );
}
