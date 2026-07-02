import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Save, Loader2, AlertCircle, Download, Upload } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useStudents, useMeasurements, useSaveMeasurementsBatch, useUpdateStudent } from "../../hooks/useSheets";
import { useGradesStandard } from "../../hooks/useGradeCalc";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { ClassMeasureTypeSelects } from "../../components/measurement/ClassMeasureTypeSelects";
import { ClassMeasureTable } from "../../components/measurement/ClassMeasureTable";
import { toast } from "../../store/toastStore";
import { buildBaseline, selectDirtyStudents } from "./classMeasureDirty";
import { mergePrefillFormValues, restoreTypes, buildMeasurementRows } from "./classMeasureForm";
import { buildTemplateCsv, applyCsvToFormValues } from "./classMeasureCsv";
import { parseCsv, downloadCsv } from "../../utils/csv";

export default function ClassMeasure() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { schoolYear } = useSettingsStore();
  const [grade, cls] = classId.split("-").map(Number);

  const { data: students = [], isLoading } = useStudents();
  // poll: false — 30초 폴링이 입력 중인 폼/종목 선택을 되돌리는 것 방지
  const { data: measurements = [], isFetched: measurementsFetched } = useMeasurements({ poll: false });
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

  // 프리필 시점 스냅샷 (서버 저장값 기준) — 저장 시 dirty 판정의 기준선
  const [baseline, setBaseline] = useState({});
  // 프리필 시점 종목 스냅샷 — 값이 그대로여도 종목이 바뀌면 저장 대상이 되도록
  const [baselineTypes, setBaselineTypes] = useState(null);
  // 프리필 1회 실행 가드 — 폴링/리포커스 refetch로 폼·종목 선택이 되돌아가는 것 방지
  const initializedRef = useRef(false);

  // 저장된 측정값 + 학생 키/몸무게를 폼에 반영 (localStorage 초안 없는 학생만) — 데이터 준비 후 1회만
  useEffect(() => {
    if (initializedRef.current) return;
    if (!classStudents.length || !measurementsFetched) return;
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaseline(buildBaseline(classStudents, existingMeasurements));
    setFormValues((prev) => mergePrefillFormValues(prev, classStudents, existingMeasurements));
    // 저장된 종목 타입 복원 + 종목 스냅샷 (미저장 시 기본값이 기준선)
    const restoredTypes = restoreTypes(existingMeasurements);
    setCardioType(restoredTypes.cardio);
    setMuscleType(restoredTypes.muscle);
    setAgilityType(restoredTypes.agility);
    setBaselineTypes(restoredTypes);
  }, [classStudents, existingMeasurements, measurementsFetched]);

  // 프리필 이후 종목이 바뀐 영역 — 값이 그대로여도 해당 영역 값이 있는 행은 저장 대상
  const changedAreas = baselineTypes
    ? [
        ...(cardioType !== baselineTypes.cardio ? ["cardio"] : []),
        ...(muscleType !== baselineTypes.muscle ? ["muscle"] : []),
        ...(agilityType !== baselineTypes.agility ? ["agility"] : []),
      ]
    : [];

  // 미저장 변경 여부 — 저장 전 이탈 경고용 (저장 대상 판정과 동일 기준)
  const hasUnsavedChanges =
    selectDirtyStudents(classStudents, formValues, baseline, changedAreas).length > 0;

  // 미저장 상태에서 새로고침/창 닫기 경고
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleChange = (studentId, field, value) => {
    const next = {
      ...formValues,
      [studentId]: { ...(formValues[studentId] || {}), [field]: value },
    };
    setFormValues(next);
    localStorage.setItem(`paps_draft_${classId}_${schoolYear}`, JSON.stringify(next));
  };

  // 저장
  const handleSave = async () => {
    if (!gradesData) {
      toast.error("등급 기준 데이터가 로드되지 않았습니다. 잠시 후 다시 시도하세요.");
      return;
    }
    // 프리필 스냅샷과 달라진(dirty) 학생만 저장 — 무변경 학생 재저장 시 중복 append 방지
    const toBeSaved = selectDirtyStudents(classStudents, formValues, baseline, changedAreas);
    if (toBeSaved.length === 0) {
      toast.info("변경된 학생이 없습니다.");
      return;
    }

    const mList = buildMeasurementRows(
      toBeSaved,
      formValues,
      { cardioType, muscleType, agilityType },
      { schoolYear, teacherEmail: user?.email || "" },
      gradesData
    );

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
      // 저장 성공 → 저장된 학생의 현재 값을 새 스냅샷으로 (재클릭 시 무변경 판정)
      setBaseline((prev) => {
        const next = { ...prev };
        toBeSaved.forEach((s) => {
          next[s.student_id] = { ...formValues[s.student_id] };
        });
        return next;
      });
      // 저장된 종목이 새 기준선 — 종목만 다시 바꾸면 재저장 대상이 되도록
      setBaselineTypes({ cardio: cardioType, muscle: muscleType, agility: agilityType });
      localStorage.removeItem(`paps_draft_${classId}_${schoolYear}`);
      toast.success(`${mList.length}명 측정 데이터가 저장됐습니다.`);
    } catch (err) {
      if (err?.code === "ROW_MISMATCH") {
        toast.error(err.message);
      } else if (err?.message === "QUOTA_EXCEEDED") {
        toast.error("Google Sheets API 한도 초과. 잠시 후 자동 재시도됩니다.");
      } else {
        toast.error("저장에 실패했습니다. 데이터는 임시저장됐습니다.");
      }
      saveBatch.reset();
    }
  };

  // 측정 CSV 템플릿 다운로드 (학급 학생 사전 입력) — BOM 포함: Excel 한글 깨짐 방지
  const handleTemplateDownload = () => {
    downloadCsv(
      `측정기록_${grade}학년${cls}반_${schoolYear}.csv`,
      buildTemplateCsv(classStudents, { cardioType, muscleType, agilityType })
    );
  };

  // 측정 CSV 업로드 → formValues에 반영
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const next = applyCsvToFormValues(parseCsv(ev.target.result), formValues);
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
      <ClassMeasureTypeSelects
        cardioType={cardioType} setCardioType={setCardioType}
        muscleType={muscleType} setMuscleType={setMuscleType}
        agilityType={agilityType} setAgilityType={setAgilityType}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-500">로딩 중...</span>
        </div>
      ) : (
        <ClassMeasureTable
          classStudents={classStudents}
          measuredIds={measuredIds}
          formValues={formValues}
          cardioType={cardioType}
          muscleType={muscleType}
          agilityType={agilityType}
          onChange={handleChange}
          onDetail={(studentId) => navigate(`/measure/${classId}/${studentId}`)}
        />
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
