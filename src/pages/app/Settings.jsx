import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, LogOut, TestTube2, Loader2, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { revokeToken, sheetsRequest } from "../../api/sheetsClient";
import { checkSchemaVersion } from "../../api/settings";
import { useSchemaCheck } from "../../hooks/useSchemaCheck";
import { SCHEMA_VERSION, SHEET_NAMES } from "../../constants/paps";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { toast } from "../../store/toastStore";
import { getStudents } from "../../api/students";
import { getMeasurements, batchUpdateMeasurementGrades } from "../../api/measurements";
import { calcGrade, calcTotalGrade } from "../../utils/gradeCalc";
import { calcBMI, calcBMIGrade } from "../../utils/bmiCalc";

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearUser } = useAuthStore();
  const {
    sheetId, schoolName, schoolYear, teacherName,
    setSheetId, setSchoolInfo, resetSettings,
  } = useSettingsStore();

  const { sheetVersion, checkAndMigrate } = useSchemaCheck();
  const [form, setForm] = useState({ schoolName, schoolYear, teacherName });
  const [newSheetId, setNewSheetId] = useState(sheetId || "");
  const [testState, setTestState] = useState(null); // null | "testing" | "ok" | "error"
  const [testMsg, setTestMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [recalcState, setRecalcState] = useState(null); // null | "loading" | "done" | "error"
  const [recalcMsg, setRecalcMsg] = useState("");

  const handleSchoolSave = () => {
    setSchoolInfo(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("학교 정보가 저장됐습니다.");
  };

  const handleSheetTest = async () => {
    const id = newSheetId.trim();
    if (!id) return;
    setTestState("testing");
    try {
      const ok = await checkSchemaVersion(id);
      if (ok) {
        setTestState("ok");
        setTestMsg("연동 성공 — 스키마 버전 일치");
        setSheetId(id);
        toast.success("Sheet 연동이 업데이트됐습니다.");
      } else {
        setTestState("error");
        setTestMsg("스키마 버전 불일치 또는 올바르지 않은 템플릿");
      }
    } catch {
      setTestState("error");
      setTestMsg("Sheet에 접근할 수 없습니다.");
    }
  };

  const handleRefreshAll = () => {
    queryClient.invalidateQueries();
    toast.success("모든 데이터를 새로고침합니다.");
  };

  const handleRecalcGrades = async () => {
    if (!sheetId) return;
    setRecalcState("loading");
    setRecalcMsg("");
    try {
      // grades_standard 데이터 로드
      const gsData = await sheetsRequest({
        path: `/${sheetId}/values/${SHEET_NAMES.GRADES_STANDARD}!A2:I`,
      });
      const gradesData = (gsData.values || []).map((row) => ({
        grade_level: Number(row[0]),
        gender: row[1],
        item: row[2],
        grade1_min: Number(row[3]),
        grade2_min: Number(row[4]),
        grade3_min: Number(row[5]),
        grade4_min: Number(row[6]),
        grade5_min: Number(row[7]),
        higher_is_better: String(row[8]).toLowerCase() === "true",
      }));
      if (!gradesData.length) {
        setRecalcState("error");
        setRecalcMsg("grades_standard 시트가 비어있습니다. 온보딩에서 기준표를 먼저 등록해주세요.");
        return;
      }

      const [allStudents, allMeasurements] = await Promise.all([
        getStudents(sheetId),
        getMeasurements(sheetId),
      ]);

      const studentMap = new Map(allStudents.map((s) => [s.student_id, s]));

      const toUpdate = [];
      allMeasurements.forEach((m, rowIndex) => {
        const student = studentMap.get(m.student_id);
        if (!student) return;

        const bmi = calcBMI(student.height, student.weight);
        const bmi_grade = calcBMIGrade(bmi);

        const cardio_grade = calcGrade(m.cardio_value, m.cardio_type, student.grade, student.gender, gradesData);
        const muscle_grade = calcGrade(m.muscle_value, m.muscle_type, student.grade, student.gender, gradesData);
        const flexibility_grade = calcGrade(m.flexibility_value, "sit_and_reach", student.grade, student.gender, gradesData);
        const agility_grade = calcGrade(m.agility_value, m.agility_type, student.grade, student.gender, gradesData);
        const total_grade = calcTotalGrade([cardio_grade, muscle_grade, flexibility_grade, agility_grade, bmi_grade]);

        // 변경이 있는 행만 업데이트
        if (
          cardio_grade !== m.cardio_grade ||
          muscle_grade !== m.muscle_grade ||
          flexibility_grade !== m.flexibility_grade ||
          agility_grade !== m.agility_grade ||
          bmi_grade !== m.bmi_grade ||
          total_grade !== m.total_grade
        ) {
          toUpdate.push({
            rowIndex,
            measurement: { ...m, bmi, bmi_grade, cardio_grade, muscle_grade, flexibility_grade, agility_grade, total_grade },
          });
        }
      });

      if (!toUpdate.length) {
        setRecalcState("done");
        setRecalcMsg("모든 등급이 이미 최신 상태입니다.");
        return;
      }

      await batchUpdateMeasurementGrades(sheetId, toUpdate);
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      setRecalcState("done");
      setRecalcMsg(`${toUpdate.length}건의 측정 기록 등급이 재계산됐습니다.`);
      toast.success(`등급 재계산 완료 (${toUpdate.length}건)`);
    } catch (err) {
      console.error("[recalcGrades]", err);
      setRecalcState("error");
      setRecalcMsg(err?.message || "알 수 없는 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    revokeToken();
    clearUser();
    resetSettings();
    navigate("/onboarding", { replace: true });
  };

  return (
    <AppLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">설정</h1>

      <div className="max-w-2xl space-y-6">
        {/* 계정 정보 */}
        <Card>
          <CardHeader><CardTitle className="text-base">로그인 계정</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            {user?.picture && (
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheet 연동 */}
        <Card>
          <CardHeader><CardTitle className="text-base">Google Sheets 연동</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Sheet ID</Label>
              <div className="flex gap-2">
                <Input
                  value={newSheetId}
                  onChange={(e) => { setNewSheetId(e.target.value); setTestState(null); }}
                  placeholder="Sheet ID 또는 URL"
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={handleSheetTest} disabled={testState === "testing"}>
                  {testState === "testing"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><TestTube2 className="h-4 w-4" /> 테스트</>
                  }
                </Button>
              </div>
            </div>
            {testState === "ok" && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{testMsg}</AlertDescription>
              </Alert>
            )}
            {testState === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testMsg}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>현재 연결:</span>
              <Badge variant="outline" className="font-mono text-xs truncate max-w-xs">{sheetId || "없음"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 학교 정보 */}
        <Card>
          <CardHeader><CardTitle className="text-base">학교 정보</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>학교명</Label>
                <Input
                  value={form.schoolName}
                  onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>담당교사명</Label>
                <Input
                  value={form.teacherName}
                  onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>학년도</Label>
                <Input
                  type="number"
                  min="2020" max="2030"
                  value={form.schoolYear}
                  onChange={(e) => setForm((f) => ({ ...f, schoolYear: Number(e.target.value) }))}
                />
              </div>
            </div>
            <Button onClick={handleSchoolSave} variant={saved ? "outline" : "default"}>
              {saved ? <><CheckCircle className="h-4 w-4 text-green-500" /> 저장됨</> : "저장"}
            </Button>
          </CardContent>
        </Card>

        {/* 시스템 정보 */}
        <Card>
          <CardHeader><CardTitle className="text-base">시스템 정보</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">앱 버전</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">스키마 버전 (앱)</span>
                <Badge variant="outline" className="font-mono text-xs">{SCHEMA_VERSION}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">스키마 버전 (Sheet)</span>
                <Badge variant="outline" className="font-mono text-xs">{sheetVersion || "확인 중..."}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">연결된 Sheet ID</span>
                <span className="font-mono text-xs text-gray-700 truncate max-w-[180px]">{sheetId || "-"}</span>
              </div>
            </div>
            <div className="border-t pt-3">
              <Button variant="outline" size="sm" onClick={checkAndMigrate}>
                <RefreshCw className="h-4 w-4" /> 버전 재확인
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 데이터 관리 */}
        <Card>
          <CardHeader><CardTitle className="text-base">데이터 관리</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">측정 등급 재계산</p>
                <p className="text-xs text-gray-500">
                  grades_standard 기준표를 기반으로 기존 측정 기록의 등급을 다시 계산해 저장합니다.
                  기준표 업데이트 후 등급이 표시되지 않을 때 사용하세요.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={recalcState === "loading"}
                onClick={handleRecalcGrades}
              >
                {recalcState === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> 계산 중...</>
                  : <><RotateCcw className="h-4 w-4" /> 재계산</>
                }
              </Button>
            </div>
            {recalcState === "done" && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{recalcMsg}</AlertDescription>
              </Alert>
            )}
            {recalcState === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{recalcMsg}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 시스템 */}
        <Card>
          <CardHeader><CardTitle className="text-base">시스템</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">데이터 새로고침</p>
                <p className="text-xs text-gray-500">모든 캐시를 무효화하고 최신 데이터를 가져옵니다</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefreshAll}>
                <RefreshCw className="h-4 w-4" /> 새로고침
              </Button>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <p className="text-sm font-medium text-red-600">로그아웃</p>
                <p className="text-xs text-gray-500">인증 토큰 및 설정이 초기화됩니다</p>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> 로그아웃
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
