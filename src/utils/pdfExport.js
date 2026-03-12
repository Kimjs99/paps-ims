import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// DOM 요소 → PDF 변환 (단일 페이지)
export const exportElementToPdf = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width / 2, canvas.height / 2],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(filename);
};

// 다중 페이지 PDF (학급 보고서)
export const exportMultiPagePdf = async (pageElementIds, filename) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < pageElementIds.length; i++) {
    const element = document.getElementById(pageElementIds[i]);
    if (!element) continue;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  }

  pdf.save(filename);
};

// 학급 전체 개인 카드 일괄 생성 (A5 사이즈)
export const exportAllPersonalCards = async (
  studentIds,
  getElementId,
  filename,
  onProgress
) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

  for (let i = 0; i < studentIds.length; i++) {
    const elementId = getElementId(studentIds[i]);
    const element = document.getElementById(elementId);
    if (!element) continue;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    if (onProgress) onProgress(Math.round(((i + 1) / studentIds.length) * 100));
  }

  pdf.save(filename);
};
