import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { toast } from "../../store/toastStore";
import { parseCsv, readCsvFile } from "../../utils/csv";
import { CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES } from "../../constants/paps";
import {
  IMPORT_FIELDS, MEASURE_FIELDS, detectHeaderRow, guessMapping, guessMeasurementMapping,
  guessTypes, mappingSignature, buildImportRows,
} from "../../pages/app/studentImport";

const PRESET_KEY = "paps-import-presets";
const NONE = "__none";

const loadPresets = () => {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || {}; } catch { return {}; }
};
const savePreset = (signature, mapping) => {
  if (!signature) return;
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify({ ...loadPresets(), [signature]: mapping }));
  } catch { /* 저장 실패는 치명적이지 않음 */ }
};

// 열 라벨: A, B, ... Z, AA ...
const colLabel = (idx) => {
  let n = idx, s = "";
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
};

// 파일 → 2차원 그리드. CSV는 인코딩 폴백, XLSX는 동적 로드(시트 여러 개면 목록 반환)
async function fileToGrid(file, sheetName) {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const names = wb.SheetNames;
    const target = sheetName && names.includes(sheetName) ? sheetName : names[0];
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[target], { header: 1, raw: false, defval: "" });
    return { grid, sheetNames: names, sheetName: target };
  }
  const text = await readCsvFile(file);
  return { grid: parseCsv(text), sheetNames: [], sheetName: null };
}

// 컬럼 매핑 셀렉트 (학생 필드·측정 기록 공용)
function ColumnSelect({ label, fieldKey, mapping, setMapping, headerCells, extra }) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {extra}
      </Label>
      <Select
        value={mapping[fieldKey] != null ? String(mapping[fieldKey]) : NONE}
        onValueChange={(v) => setMapping((m) => {
          const next = { ...m };
          if (v === NONE) delete next[fieldKey];
          else next[fieldKey] = Number(v);
          return next;
        })}
      >
        <SelectTrigger aria-label={`${label} 컬럼 선택`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— 없음 —</SelectItem>
          {headerCells.map((cell, idx) => (
            <SelectItem key={idx} value={String(idx)}>
              {colLabel(idx)}열: {String(cell).replace(/\s+/g, " ").slice(0, 20) || "(빈 셀)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// 측정 종목 유형 셀렉트
function TypeSelect({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// 임의 양식(CSV/XLSX) → 컬럼 매핑 → 학생 일괄 등록 후보 생성 마법사
// 검증·등록은 Students 페이지의 기존 경로(csvPreview → 일괄 등록)를 재사용한다.
export function ImportWizardDialog({
  open, onOpenChange, studentSchema, gradeOptions, existingIds, onApply,
}) {
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [grid, setGrid] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [sheetName, setSheetName] = useState(null);
  const [headerRow, setHeaderRow] = useState(-1);
  const [mapping, setMapping] = useState({});
  const [fbGrade, setFbGrade] = useState("");
  const [fbClass, setFbClass] = useState("");
  const [importMeasures, setImportMeasures] = useState(false);
  const [types, setTypes] = useState({ cardioType: "shuttle_run", muscleType: "sit_up", agilityType: "sprint_50m" });

  const reset = () => {
    setFile(null); setGrid(null); setSheetNames([]); setSheetName(null);
    setHeaderRow(-1); setMapping({}); setFbGrade(""); setFbClass("");
    setImportMeasures(false);
    setTypes({ cardioType: "shuttle_run", muscleType: "sit_up", agilityType: "sprint_50m" });
  };

  // 헤더 행 기준 학생 + 측정 기록 컬럼 자동 매핑
  const autoMap = (headerCells) => ({
    ...guessMapping(headerCells),
    ...guessMeasurementMapping(headerCells),
  });

  const applyGrid = (g) => {
    setGrid(g);
    const detected = detectHeaderRow(g);
    const row = detected.headerRow >= 0 ? detected.headerRow : 0;
    setHeaderRow(row);
    // 같은 양식을 다시 올리면 저장된 매핑 프리셋 자동 적용 (구버전 프리셋은 mapping 객체 그대로)
    const preset = loadPresets()[mappingSignature(g[row])];
    const nextMapping = preset?.mapping || preset || autoMap(g[row]);
    setMapping(nextMapping);
    setTypes(preset?.types || guessTypes(g[row]));
    // 측정 기록 컬럼이 하나라도 인식되면 함께 등록 기본 활성화
    setImportMeasures(MEASURE_FIELDS.some((f) => nextMapping[f.key] != null));
  };

  const handleFile = async (f, targetSheet) => {
    if (!f) return;
    setParsing(true);
    try {
      const { grid: g, sheetNames: names, sheetName: selected } = await fileToGrid(f, targetSheet);
      if (!g.length) { toast.error("파일에서 데이터를 찾지 못했습니다."); return; }
      setFile(f); setSheetNames(names); setSheetName(selected);
      applyGrid(g);
    } catch (err) {
      console.error("[importWizard]", err);
      toast.error(`파일을 읽지 못했습니다: ${err?.message || "알 수 없는 오류"}`);
    } finally {
      setParsing(false);
    }
  };

  // 헤더 행이 데이터 행보다 짧아도 모든 컬럼을 매핑 옵션으로 제공 (빈 헤더 셀은 열 문자로 표시)
  const headerCells = useMemo(() => {
    if (!grid || headerRow < 0) return [];
    const maxCols = Math.max(...grid.slice(headerRow, headerRow + 5).map((r) => r.length));
    return Array.from({ length: maxCols }, (_, i) => grid[headerRow][i] ?? "");
  }, [grid, headerRow]);
  const needFallback = mapping.grade == null || mapping.class == null;

  // 현재 설정 기준 실시간 후보 생성 (미리보기·적용 공용)
  const built = useMemo(() => {
    if (!grid || headerRow < 0) return { candidates: [], errors: [] };
    return buildImportRows(grid, headerRow, mapping, {
      fallbackGrade: fbGrade, fallbackClass: fbClass, existingIds,
    });
  }, [grid, headerRow, mapping, fbGrade, fbClass, existingIds]);

  const handleApply = () => {
    const valid = [];
    const errors = [...built.errors];
    const byStudent = {};
    built.candidates.forEach(({ line, data, measures }) => {
      const result = studentSchema.safeParse(data);
      if (result.success) {
        valid.push(result.data);
        if (Object.values(measures).some((v) => v !== "")) byStudent[result.data.student_id] = measures;
      } else {
        errors.push(`${line}행(${data.name}): ${result.error.issues.map((i) => i.message).join(", ")}`);
      }
    });
    savePreset(mappingSignature(headerCells), { mapping, types });
    const measurePayload =
      importMeasures && Object.keys(byStudent).length > 0 ? { types, byStudent } : null;
    onApply(valid, errors, measurePayload);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>양식 가져오기</DialogTitle>
          <DialogDescription>
            학교 기록시트지 등 임의 양식의 CSV/Excel 파일에서 학생 명단을 가져옵니다.
            헤더 위치와 컬럼을 자동 인식하며, 필요한 항목만 확인해 주세요.
          </DialogDescription>
        </DialogHeader>

        {/* 1단계: 파일 선택 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            파일 선택
          </Button>
          <input
            ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
          />
          {file && <span className="text-sm text-gray-600 truncate">{file.name}</span>}
          {sheetNames.length > 1 && (
            <Select value={sheetName} onValueChange={(v) => handleFile(file, v)}>
              <SelectTrigger className="w-40" aria-label="시트 선택"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sheetNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {grid && (
          <>
            {/* 2단계: 헤더 행·컬럼 매핑 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>헤더 행 (항목명이 있는 행)</Label>
                <Select value={String(headerRow)} onValueChange={(v) => {
                  const row = Number(v);
                  setHeaderRow(row);
                  setMapping(guessMapping(grid[row]));
                }}>
                  <SelectTrigger aria-label="헤더 행 선택"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {grid.slice(0, 20).map((row, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {idx + 1}행: {row.filter(Boolean).slice(0, 4).join(", ").slice(0, 30) || "(빈 행)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {IMPORT_FIELDS.map((field) => (
                <ColumnSelect
                  key={field.key}
                  label={field.label}
                  fieldKey={field.key}
                  mapping={mapping}
                  setMapping={setMapping}
                  headerCells={headerCells}
                  extra={
                    field.key === "name" ? " *"
                      : field.key === "number" ? <span className="text-gray-400 font-normal text-xs"> (학번 생성용)</span>
                      : null
                  }
                />
              ))}
            </div>

            {/* 체력측정 기록 함께 등록 */}
            <div className="p-3 border rounded-lg space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={importMeasures}
                  onChange={(e) => setImportMeasures(e.target.checked)}
                />
                체력측정 기록도 함께 등록 (등급·BMI는 기준표로 자동 계산)
              </label>
              {importMeasures && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {MEASURE_FIELDS.map((field) => (
                      <ColumnSelect
                        key={field.key}
                        label={field.label}
                        fieldKey={field.key}
                        mapping={mapping}
                        setMapping={setMapping}
                        headerCells={headerCells}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <TypeSelect
                      label="심폐지구력 종목" options={CARDIO_TYPES}
                      value={types.cardioType}
                      onChange={(v) => setTypes((t) => ({ ...t, cardioType: v }))}
                    />
                    <TypeSelect
                      label="근력·근지구력 종목" options={MUSCLE_TYPES}
                      value={types.muscleType}
                      onChange={(v) => setTypes((t) => ({ ...t, muscleType: v }))}
                    />
                    <TypeSelect
                      label="순발력 종목" options={AGILITY_TYPES}
                      value={types.agilityType}
                      onChange={(v) => setTypes((t) => ({ ...t, agilityType: v }))}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 학년/반 컬럼이 없는 양식(학급 단위 시트) → 직접 입력 */}
            {needFallback && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 mb-2">
                  이 양식에는 학년/반 컬럼이 없습니다. 전체 행에 적용할 값을 입력해 주세요.
                  {mapping.student_id == null && " (학번은 학년+반+번호로 자동 생성됩니다 — 예: 1학년 1반 1번 → 10101)"}
                </p>
                <div className="flex gap-2">
                  {mapping.grade == null && (
                    <Select value={fbGrade} onValueChange={setFbGrade}>
                      <SelectTrigger className="w-28" aria-label="학년 직접 입력"><SelectValue placeholder="학년" /></SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map((g) => <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {mapping.class == null && (
                    <Input
                      className="w-28" type="number" min={1} max={20} placeholder="반"
                      aria-label="반 직접 입력"
                      value={fbClass} onChange={(e) => setFbClass(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 3단계: 미리보기 */}
            <div>
              <p className="text-sm font-medium mb-1">
                미리보기 — {built.candidates.length}명 인식
                {built.errors.length > 0 && <span className="text-red-600"> · 오류 {built.errors.length}행</span>}
              </p>
              <div className="border rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학번</TableHead><TableHead>이름</TableHead><TableHead>성별</TableHead>
                      <TableHead>학년</TableHead><TableHead>반</TableHead><TableHead>키</TableHead><TableHead>몸무게</TableHead>
                      {importMeasures && (
                        <><TableHead>심폐</TableHead><TableHead>근력</TableHead><TableHead>유연성</TableHead><TableHead>순발력</TableHead></>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {built.candidates.slice(0, 8).map(({ line, data, measures }) => (
                      <TableRow key={line}>
                        <TableCell>{data.student_id}</TableCell>
                        <TableCell>{data.name}</TableCell>
                        <TableCell>{data.gender === "M" ? "남" : data.gender === "F" ? "여" : "?"}</TableCell>
                        <TableCell>{data.grade}</TableCell>
                        <TableCell>{data.class}</TableCell>
                        <TableCell>{data.height}</TableCell>
                        <TableCell>{data.weight}</TableCell>
                        {importMeasures && (
                          <>
                            <TableCell>{measures.cardio_value}</TableCell>
                            <TableCell>{measures.muscle_value}</TableCell>
                            <TableCell>{measures.flexibility_value}</TableCell>
                            <TableCell>{measures.agility_value}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {built.candidates.length > 8 && (
                  <p className="text-xs text-gray-500 p-2">... 외 {built.candidates.length - 8}명</p>
                )}
              </div>
              {built.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600 space-y-0.5 max-h-20 overflow-auto">
                  {built.errors.slice(0, 5).map((msg, i) => <p key={i}>{msg}</p>)}
                  {built.errors.length > 5 && <p>... 외 {built.errors.length - 5}건</p>}
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>취소</Button>
          <Button onClick={handleApply} disabled={!grid || built.candidates.length === 0}>
            {built.candidates.length > 0 ? `${built.candidates.length}명 검증 후 등록 목록에 추가` : "등록 목록에 추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
