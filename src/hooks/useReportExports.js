// 보고서 PDF 내보내기 상태·핸들러 훅 — Report.jsx에서 분리
// (react-refresh/only-export-components: 훅은 컴포넌트 파일과 분리)
// isExporting은 학급/개인 탭이 공유, 일괄 내보내기는 오프스크린 렌더(batchStudents) 후 캡처하는 기존 흐름 유지.

import { useState } from "react";
import { exportMultiPagePdf, exportAllPersonalCards } from "../utils/pdfExport";

export function useReportExports({ classLabel, filteredStudents, selectedStudent, selectedStudentId }) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchStudents, setBatchStudents] = useState([]);
  const [isBatchRendering, setIsBatchRendering] = useState(false);

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

  // 개인 카드 — 선택한 학생 단일 PDF
  const handleSingleCardExport = async () => {
    if (!selectedStudent) return;
    setIsExporting(true);
    try {
      const { exportElementToPdf } = await import("../utils/pdfExport");
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

  return {
    isExporting, progress, batchStudents, isBatchRendering,
    handleClassPdfExport, handleSingleCardExport, handleBatchCardExport,
  };
}
