// CSV 파싱/다운로드 유틸 — ClassMeasure(측정 CSV)·Students(학생 CSV) 공용
// 파서는 따옴표 인식(quote-aware): 큰따옴표로 감싼 필드 내부의 쉼표·이스케이프("")를 처리한다.

// CSV 한 줄 → 셀 배열 (각 셀 trim — 기존 split(",").map(trim) 동작과 동일한 공백 처리)
export const parseCsvLine = (line) => {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'; // 이스케이프된 따옴표
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
};

// CSV 전체 텍스트 → 행 배열 (BOM 제거, CR/LF 처리, 빈 줄 제외)
export const parseCsv = (text) =>
  String(text ?? "")
    .replace(/^\uFEFF/, "") // UTF-8 BOM 제거
    .split("\n")
    .map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l))
    .filter((l) => l.trim())
    .map(parseCsvLine);

// CSV 문자열을 파일로 다운로드 (bom: Excel 한글 깨짐 방지용 UTF-8 BOM — 기본 포함)
export const downloadCsv = (filename, content, { bom = true } = {}) => {
  const blob = new Blob([(bom ? "\uFEFF" : "") + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
