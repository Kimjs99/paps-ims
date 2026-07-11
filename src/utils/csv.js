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

// parseCsv + 원본 파일 행 번호(1-base) 보존 — 오류 안내가 실제 파일 행을 가리키도록.
// 빈 줄을 제외한 뒤의 인덱스로 "N행"을 계산하면 파일 중간 빈 줄만큼 어긋난다.
export const parseCsvWithLines = (text) =>
  String(text ?? "")
    .replace(/^\uFEFF/, "") // UTF-8 BOM 제거
    .split("\n")
    .map((l, idx) => ({ line: idx + 1, raw: l.endsWith("\r") ? l.slice(0, -1) : l }))
    .filter(({ raw }) => raw.trim())
    .map(({ line, raw }) => ({ line, cells: parseCsvLine(raw) }));

// 기록시트지 표기(남/여)와 시트 저장값(M/F) 상호 변환 — CSV 업로드 시 성별 셀 정규화.
// 인식 불가 값은 null 반환 → 호출부에서 검증 오류로 처리
export const normalizeGender = (value) => {
  const v = String(value ?? "").trim().toUpperCase();
  if (["M", "남", "남자", "MALE"].includes(v)) return "M";
  if (["F", "W", "여", "여자", "FEMALE"].includes(v)) return "F";
  return null;
};

// CSV File → 텍스트 (인코딩 자동 감지)
// Excel에서 "CSV(쉼표로 분리)"로 저장하면 CP949(EUC-KR)로 저장돼 UTF-8로 읽으면 한글이 깨진다.
// UTF-8 엄격 디코딩을 먼저 시도하고, 실패하면 EUC-KR로 재시도한다.
export const readCsvFile = async (file) => {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("euc-kr").decode(buffer);
  }
};

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
