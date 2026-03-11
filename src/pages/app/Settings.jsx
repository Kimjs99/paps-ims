import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, LogOut, TestTube2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { revokeToken } from "../../api/sheetsClient";
import { checkSchemaVersion } from "../../api/settings";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { toast } from "../../store/toastStore";

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearUser } = useAuthStore();
  const {
    sheetId, schoolName, schoolYear, teacherName,
    setSheetId, setSchoolInfo, resetSettings,
  } = useSettingsStore();

  const [form, setForm] = useState({ schoolName, schoolYear, teacherName });
  const [newSheetId, setNewSheetId] = useState(sheetId || "");
  const [testState, setTestState] = useState(null); // null | "testing" | "ok" | "error"
  const [testMsg, setTestMsg] = useState("");
  const [saved, setSaved] = useState(false);

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
              <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
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
