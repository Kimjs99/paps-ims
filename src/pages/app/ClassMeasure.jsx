import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Save, Loader2, AlertCircle, Download, Upload } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useStudents, useMeasurements, useSaveMeasurementsBatch, useUpdateStudent } from "../../hooks/useSheets";
import { useGradesStandard } from "../../hooks/useGradeCalc";
import { calcGrade, calcTotalGrade } from "../../utils/gradeCalc";
import { calcBMI, calcBMIGrade } from "../../utils/bmiCalc";
import { VALID_RANGES, CARDIO_TYPES, MUSCLE_TYPES, AGILITY_TYPES } from "../../constants/paps";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GradeBadge } from "../../components/ui/GradeBadge";
import { MeasurementStatusBadge } from "../../components/measurement/MeasurementStatusBadge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "../../store/toastStore";

// 유효 범위 체크
const isOutOfRange = (field, value) => {
  const range = VALID_RANGES[field];
  if (!range || value === "" || value === null || value === undefined) return false;
  const num = Number(value);
  return num < range.min || num > range.max;
};

export default function ClassMeasure() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { schoolYear } = useSettingsStore();
  const [grade, cls] = classId.split("-").map(Number);

  const { data: students = [], isLoading } = useStudents();
  const { data: measurements = [] } = useMeasurements();
  const { data: gradesData } = useGradesStandard();
  const saveBatch = useSaveMeasurementsBatch();
  const updateStudent = useUpdateStudent();
  const csvRef = useRef();

  // 해당 학급 학생
  const classStudents = useMemo(
    () => students.filter((s) => s.grade === grade && s.class === cls && s.is_active !== false)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [students, grade, cls]
  );

  // 이미 측정된 학생 맵 (현재 학년도)
  const existingMeasurements = useMemo(() => {
    const map = {};
    measurements
      .filter((m) => m.year === schoolYear)
      .forEach((m) => { map[m.student_id] = m; });
    return map;
  }, [measurements, schoolYear]);

  const measuredIds = useMemo(
    () => new Set(Object.keys(existingMeasurements)),
    [existingMeasurements]
  );

  // 종목 선택 (학급 단위 공통)
  const [cardioType, setCardioType] = useState("shuttle_run");
  const [muscleType, setMuscleType] = useState("sit_up");
  const [agilityType, setAgilityType] = useState("sprint_50m");

  // 입력값 상태 (초기값에서 임시저장 복원)
  const [formValues, setFormValues] = useState(() => {
    const draft = localStorage.getItem(`paps_draft_${classId}_${schoolYear}`);
    if (draft) {
      try { return JSON.parse(draft); } catch { /* ignore */ }
    }
    return {};
  });

  // 저장된 측정값 + 학생 키/몸무게를 폼에 반영 (localStorage 초안 없는 학생만)
  useEffect(() => {
    if (!classStudents.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormValues((prev) => {
      const next = { ...prev };
      classStudents.forEach((s) => {
        if (!next[s.student_id]) {
          const m = existingMeasurements[s.student_id];
          next[s.student_id] = {
            height: s.height ?? "",
            weight: s.weight ?? "",
            cardio_value: m?.cardio_value ?? "",
            muscle_value: m?.muscle_value ?? "",
            flexibility_value: m?.flexibility_value ?? "",
            agility_value: m?.agility_value ?? "",
          };
        } else if (next[s.student_id].height === undefined) {
          // draft는 있지만 키/몸무게가 없으면 학생 데이터로 채움
          next[s.student_id] = {
            height: s.height ?? "",
            weight: s.weight ?? "",
            ...next[s.student_id],
          };
        }
      });
      return next;
    });
    // 저장된 종목 타입 복원
    const first = Object.values(existingMeasurements)[0];
    if (first) {
      if (first.cardio_type) setCardioType(first.cardio_type);
      if (first.muscle_type) setMuscleType(first.muscle_type);
      if (first.agility_type) setAgilityType(first.agility_type);
    }
  }, [classStudents, existingMeasurements]);

  const handleChange = (studentId, field, value) => {
    const next = {
      ...formValues,
      [studentId]: { ...(formValues[studentId] || {}), [field]: value },
    };
    setFormValues(next);
    localStorage.setItem(`paps_draft_${classId}_${schoolYear}`, JSON.stringify(next));
  };

  const getVal = (studentId, field) => formValues[studentId]?.[field] ?? "";

  // 저장
  const handleSave = async () => {
    if (!gradesData) {
      toast.error("등급 기준 데이터가 로드되지 않았습니다. 잠시 후 다시 시도하세요.");
      return;
    }
    const toBeSaved = classStudents.filter((s) => {
      const v = formValues[s.student_id];
      return v && Object.values(v).some((val) => val !== "" && val !== null);
    });
    if (toBeSaved.length === 0) {
      toast.error("입력된 측정값이 없습니다.");
      return;
    }

    const mList = toBeSaved.map((student) => {
      const v = formValues[student.student_id] || {};
      const cardio_value = v.cardio_value !== "" ? Number(v.cardio_value) : null;
      const muscle_value = v.muscle_value !== "" ? Number(v.muscle_value) : null;
      const flexibility_value = v.flexibility_value !== "" ? Number(v.flexibility_value) : null;
      const agility_value = v.agility_value !== "" ? Number(v.agility_value) : null;
      const height = v.height !== "" ? Number(v.height) : student.height;
      const weight = v.weight !== "" ? Number(v.weight) : student.weight;
      const bmi = calcBMI(height, weight);
      const bmi_grade = calcBMIGrade(bmi);
      const cardio_grade = calcGrade(cardio_value, cardioType, student.grade, student.gender, gradesData);
      const muscle_grade = calcGrade(muscle_value, muscleType, student.grade, student.gender, gradesData);
      const flexibility_grade = calcGrade(flexibility_value, "sit_and_reach", student.grade, student.gender, gradesData);
      const agility_grade = calcGrade(agility_value, agilityType, student.grade, student.gender, gradesData);
      const total_grade = calcTotalGrade([cardio_grade, muscle_grade, flexibility_grade, agility_grade, bmi_grade]);
      return {
        measurement_id: uuidv4(),
        student_id: student.student_id,
        year: schoolYear,
        cardio_type: cardioType, cardio_value, cardio_grade,
        muscle_type: muscleType, muscle_value, muscle_grade,
        flexibility_value, flexibility_grade,
        agility_type: agilityType, agility_value, agility_grade,
        bmi, bmi_grade, total_grade,
        teacher_email: user?.email || "",
      };
    });

    try {
      // 키/몸무게가 변경된 학생 정보 업데이트
      for (const student of toBeSaved) {
        const v = formValues[student.student_id] || {};
        const newHeight = v.height !== "" ? Number(v.height) : undefined;
        const newWeight = v.weight !== "" ? Number(v.weight) : undefined;
        const heightChanged = newHeight !== undefined && newHeight !== student.height;
        const weightChanged = newWeight !== undefined && newWeight !== student.weight;
        if (heightChanged || weightChanged) {
          const rowIndex = students.findIndex((s) => s.student_id === student.student_id);
          if (rowIndex !== -1) {
            await updateStudent.mutateAsync({
              rowIndex,
              student: { ...student, height: newHeight ?? student.height, weight: newWeight ?? student.weight },
            });
          }
        }
      }
      await saveBatch.mutateAsync(mList);
      localStorage.removeItem(`paps_draft_${classId}_${schoolYear}`);
      toast.success(`${mList.length}명 측정 데이터가 저장됐습니다.`);
    } catch (err) {
      if (err?.message === "QUOTA_EXCEEDED") {
        toast.error("Google Sheets API 한도 초과. 잠시 후 자동 재시도됩니다.");
      } else {
        toast.error("저장에 실패했습니다. 데이터는 임시저장됐습니다.");
      }
      saveBatch.reset();
    }
  };

  // 측정 CSV 템플릿 다운로드 (학급 학생 사전 입력)
  const handleTemplateDownload = () => {
    const cardioLabel = CARDIO_TYPES.find((t) => t.value === cardioType)?.label || cardioType;
    const muscleLabel = MUSCLE_TYPES.find((t) => t.value === muscleType)?.label || muscleType;
    const agilityLabel = AGILITY_TYPES.find((t) => t.value === agilityType)?.label || agilityType;
    const header = `student_id,이름,성별,학년,반,키(cm),몸무게(kg),심폐지구력(${cardioLabel}),근력근지구력(${muscleLabel}),유연성(앉아윗몸앞으로굽히기cm),순발력(${agilityLabel})`;
    const rows = classStudents.map((s) =>
      [s.student_id, s.name, s.gender === "M" ? "남" : "여", s.grade, s.class,
        s.height ?? "", s.weight ?? "", "", "", "", ""].join(",")
    );
    const bom = "\uFEFF"; // UTF-8 BOM for Excel 한글 깨짐 방지
    const blob = new Blob([bom + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `측정기록_${grade}학년${cls}반_${schoolYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 측정 CSV 업로드 → formValues에 반영
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").filter((l) => l.trim());
      const next = { ...formValues };
      lines.slice(1).forEach((line) => {
        const cols = line.split(",").map((v) => v.trim());
        const [studentId, , , , , height, weight, cardio, muscle, flex, agility] = cols;
        if (!studentId) return;
        next[studentId] = {
          height: height !== "" ? height : (formValues[studentId]?.height ?? ""),
          weight: weight !== "" ? weight : (formValues[studentId]?.weight ?? ""),
          cardio_value: cardio !== "" ? cardio : (formValues[studentId]?.cardio_value ?? ""),
          muscle_value: muscle !== "" ? muscle : (formValues[studentId]?.muscle_value ?? ""),
          flexibility_value: flex !== "" ? flex : (formValues[studentId]?.flexibility_value ?? ""),
          agility_value: agility !== "" ? agility : (formValues[studentId]?.agility_value ?? ""),
        };
      });
      setFormValues(next);
      localStorage.setItem(`paps_draft_${classId}_${schoolYear}`, JSON.stringify(next));
      toast.success("CSV 데이터가 입력란에 반영됐습니다. 확인 후 저장하세요.");
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  return (
    <AppLayout>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" aria-label="뒤로 가기" onClick={() => navigate("/")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{grade}학년 {cls}반 측정</h1>
          <p className="text-sm text-gray-500">{schoolYear}년도 · 전체 {classStudents.length}명</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleTemplateDownload}>
            <Download className="h-4 w-4" /> 템플릿
          </Button>
          <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()}>
            <Upload className="h-4 w-4" /> CSV 업로드
          </Button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </div>
      </div>

      {/* 종목 선택 */}
      <div className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">심폐지구력 종목</label>
          <Select value={cardioType} onValueChange={setCardioType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CARDIO_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">근력·근지구력 종목</label>
          <Select value={muscleType} onValueChange={setMuscleType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MUSCLE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">순발력 종목</label>
          <Select value={agilityType} onValueChange={setAgilityType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AGILITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label} ({t.unit})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-500">로딩 중...</span>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-20">상태</TableHead>
                <TableHead className="w-24">이름</TableHead>
                <TableHead className="w-12 text-center">성별</TableHead>
                <TableHead>
                  키<br />
                  <span className="text-xs font-normal text-gray-400">cm</span>
                </TableHead>
                <TableHead>
                  몸무게<br />
                  <span className="text-xs font-normal text-gray-400">kg</span>
                </TableHead>
                <TableHead>
                  심폐<br />
                  <span className="text-xs font-normal text-gray-400">
                    {CARDIO_TYPES.find((t) => t.value === cardioType)?.unit}
                  </span>
                </TableHead>
                <TableHead>
                  근력<br />
                  <span className="text-xs font-normal text-gray-400">
                    {MUSCLE_TYPES.find((t) => t.value === muscleType)?.unit}
                  </span>
                </TableHead>
                <TableHead>
                  유연성<br />
                  <span className="text-xs font-normal text-gray-400">cm</span>
                </TableHead>
                <TableHead>
                  순발력<br />
                  <span className="text-xs font-normal text-gray-400">
                    {AGILITY_TYPES.find((t) => t.value === agilityType)?.unit}
                  </span>
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classStudents.map((student) => {
                const measured = measuredIds.has(student.student_id);
                const hasInput = Object.values(formValues[student.student_id] || {}).some(
                  (v) => v !== "" && v !== null
                );
                const status = measured ? "complete" : hasInput ? "complete" : "incomplete";
                const fields = [
                  { key: "cardio_value", range: cardioType },
                  { key: "muscle_value", range: muscleType },
                  { key: "flexibility_value", range: "sit_and_reach" },
                  { key: "agility_value", range: agilityType },
                ];
                return (
                  <TableRow key={student.student_id}>
                    <TableCell>
                      <MeasurementStatusBadge status={status} />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-center text-gray-500">
                      {student.gender === "M" ? "남" : "여"}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="w-20 h-8 text-sm"
                        value={getVal(student.student_id, "height")}
                        onChange={(e) => handleChange(student.student_id, "height", e.target.value)}
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="w-20 h-8 text-sm"
                        value={getVal(student.student_id, "weight")}
                        onChange={(e) => handleChange(student.student_id, "weight", e.target.value)}
                        placeholder="-"
                      />
                    </TableCell>
                    {fields.map(({ key, range }) => (
                      <TableCell key={key}>
                        <Input
                          type="number"
                          inputMode="numeric"
                          className={`w-20 h-8 text-sm ${isOutOfRange(range, getVal(student.student_id, key)) ? "border-red-400 bg-red-50" : ""}`}
                          value={getVal(student.student_id, key)}
                          onChange={(e) => handleChange(student.student_id, key, e.target.value)}
                          placeholder="-"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs px-2"
                        onClick={() => navigate(`/measure/${classId}/${student.student_id}`)}
                      >
                        상세
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="flex justify-end mt-4 gap-2">
        {saveBatch.isError && (
          <Alert variant="destructive" className="flex-1">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>저장 실패 — 임시저장 데이터를 보존했습니다.</AlertDescription>
          </Alert>
        )}
        <Button
          onClick={handleSave}
          disabled={saveBatch.isPending}
          className="min-w-32"
        >
          {saveBatch.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> 저장 중...</>
          ) : (
            <><Save className="h-4 w-4" /> 학급 전체 저장</>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
