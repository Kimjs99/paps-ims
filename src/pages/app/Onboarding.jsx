import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Progress } from "../../components/ui/progress";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { initGoogleAuth, requestAccessToken } from "../../api/sheetsClient";
import { getSettings, checkSchemaVersion } from "../../api/settings";

const STEPS = [
  { id: 1, title: "Google 로그인" },
  { id: 2, title: "Sheets 사본 만들기" },
  { id: 3, title: "Sheet ID 입력" },
  { id: 4, title: "학교 정보 입력" },
  { id: 5, title: "완료" },
];

// URL에서 Sheet ID 추출
const extractSheetId = (input) => {
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return urlMatch ? urlMatch[1] : input.trim();
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const { sheetId, setSheetId, schoolName, schoolYear, teacherName, setSchoolInfo, completeOnboarding } = useSettingsStore();

  const [step, setStep] = useState(isAuthenticated ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sheetInput, setSheetInput] = useState(sheetId || "");
  const [testResult, setTestResult] = useState(null); // null | "success" | "error"
  const [testMessage, setTestMessage] = useState("");
  const [schoolForm, setSchoolForm] = useState({
    schoolName: schoolName || "",
    schoolYear: schoolYear || new Date().getFullYear(),
    teacherName: teacherName || "",
  });

  // GIS 초기화
  useEffect(() => {
    const timer = setTimeout(() => {
      initGoogleAuth().catch(console.error);
    }, 1000); // GIS 스크립트 로드 대기
    return () => clearTimeout(timer);
  }, []);

  // 이미 완료됐으면 홈으로
  useEffect(() => {
    const { isOnboardingComplete } = useSettingsStore.getState();
    if (isAuthenticated && isOnboardingComplete) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Step 1: Google 로그인
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await initGoogleAuth();
      const tokenResponse = await requestAccessToken();

      // 사용자 정보 가져오기
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      setUser({ email: userInfo.email, name: userInfo.name, picture: userInfo.picture });
      setStep(2);
    } catch (e) {
      const msg = e?.message || "";
      if (msg === "popup_closed") {
        setError("로그인 팝업이 닫혔습니다. 팝업을 허용한 후 다시 시도해주세요.");
      } else {
        setError("Google 로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Sheet ID 연동 테스트
  const handleSheetTest = async () => {
    const extracted = extractSheetId(sheetInput);
    if (!extracted) {
      setError("Sheet ID 또는 URL을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setTestResult(null);
    try {
      const isVersionOk = await checkSchemaVersion(extracted);
      if (isVersionOk) {
        setTestResult("success");
        setTestMessage("연동 성공! 스키마 버전이 일치합니다.");
      } else {
        const settings = await getSettings(extracted);
        if (settings["SCHEMA_VERSION"]) {
          setTestResult("error");
          setTestMessage(`스키마 버전 불일치: ${settings["SCHEMA_VERSION"]} (필요: 1.0)`);
        } else {
          setTestResult("error");
          setTestMessage("올바른 PAPS-IMS 템플릿 Sheet가 아닙니다.");
        }
      }
      setSheetId(extracted);
    } catch {
      setTestResult("error");
      setTestMessage("Sheet에 접근할 수 없습니다. Sheet ID를 확인하고, 공유 설정을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: 학교 정보 저장
  const handleSchoolInfoSave = () => {
    if (!schoolForm.schoolName || !schoolForm.teacherName) {
      setError("학교명과 담당교사명은 필수입니다.");
      return;
    }
    setSchoolInfo(schoolForm);
    setStep(5);
  };

  // Step 5: 완료
  const handleComplete = () => {
    completeOnboarding();
    navigate("/", { replace: true });
  };

  const progressValue = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PAPS-IMS</h1>
          <p className="text-gray-600 mt-1">학생체력평가 관리 시스템</p>
        </div>

        {/* 진행 표시 */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            {STEPS.map((s) => (
              <span key={s.id} className={step >= s.id ? "text-blue-600 font-medium" : ""}>
                {s.id}단계
              </span>
            ))}
          </div>
          <Progress value={progressValue} className="h-2" aria-label={`온보딩 진행률 ${step}단계/${STEPS.length}단계`} />
        </div>

        {/* 카드 */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                {step}
              </span>
              <CardTitle>{STEPS[step - 1].title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: 로그인 */}
            {step === 1 && (
              <div className="space-y-4">
                <CardDescription>
                  Google 계정으로 로그인하여 Sheets API에 접근합니다.
                </CardDescription>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  className="w-full gap-2"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Google 계정으로 로그인
                </Button>
              </div>
            )}

            {/* Step 2: Sheets 사본 만들기 */}
            {step === 2 && (
              <div className="space-y-4">
                <CardDescription>
                  아래 버튼을 클릭하여 PAPS-IMS 템플릿 Sheet의 사본을 내 Google 드라이브에 저장하세요.
                </CardDescription>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-1">안내</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>"사본 만들기" 버튼 클릭</li>
                    <li>새 창에서 Google Sheets가 열립니다</li>
                    <li>파일 메뉴 → "사본 만들기" 선택</li>
                    <li>사본이 생성되면 URL을 복사하세요</li>
                  </ol>
                </div>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${import.meta.env.VITE_SHEETS_TEMPLATE_ID}/copy`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full gap-2" variant="outline">
                    <ExternalLink className="h-4 w-4" />
                    Sheets 사본 만들기
                  </Button>
                </a>
                <Button className="w-full" onClick={() => setStep(3)}>
                  사본을 만들었습니다
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 3: Sheet ID 입력 */}
            {step === 3 && (
              <div className="space-y-4">
                <CardDescription>
                  사본 Sheet의 URL 또는 ID를 입력하세요.
                </CardDescription>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono">
                  https://docs.google.com/spreadsheets/d/<span className="bg-yellow-200 px-1 rounded">여기가 Sheet ID</span>/edit
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheetInput">Sheet URL 또는 ID</Label>
                  <Input
                    id="sheetInput"
                    placeholder="URL 또는 ID 붙여넣기"
                    value={sheetInput}
                    onChange={(e) => {
                      setSheetInput(e.target.value);
                      setTestResult(null);
                    }}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {testResult === "success" && (
                  <Alert className="border-green-500 bg-green-50 text-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>{testMessage}</AlertDescription>
                  </Alert>
                )}
                {testResult === "error" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{testMessage}</AlertDescription>
                  </Alert>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSheetTest}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "연동 테스트"}
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setStep(4)}
                  disabled={testResult !== "success"}
                >
                  다음 단계
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 4: 학교 정보 입력 */}
            {step === 4 && (
              <div className="space-y-4">
                <CardDescription>학교 및 담당 교사 정보를 입력하세요.</CardDescription>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="schoolName">학교명 *</Label>
                  <Input
                    id="schoolName"
                    placeholder="○○중학교"
                    value={schoolForm.schoolName}
                    onChange={(e) => setSchoolForm((f) => ({ ...f, schoolName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherName">담당교사명 *</Label>
                  <Input
                    id="teacherName"
                    placeholder="홍길동"
                    value={schoolForm.teacherName}
                    onChange={(e) => setSchoolForm((f) => ({ ...f, teacherName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolYear">학년도</Label>
                  <Input
                    id="schoolYear"
                    type="number"
                    min="2020"
                    max="2030"
                    value={schoolForm.schoolYear}
                    onChange={(e) => setSchoolForm((f) => ({ ...f, schoolYear: Number(e.target.value) }))}
                  />
                </div>
                <Button className="w-full" onClick={handleSchoolInfoSave}>
                  저장하고 다음 단계
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 5: 완료 */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-3" />
                  <p className="text-lg font-semibold text-gray-900">설정 완료!</p>
                  <p className="text-sm text-gray-600">이제 PAPS 측정을 시작할 수 있습니다.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">로그인 계정</span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">학교명</span>
                    <span className="font-medium">{schoolForm.schoolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">담당교사</span>
                    <span className="font-medium">{schoolForm.teacherName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">학년도</span>
                    <span className="font-medium">{schoolForm.schoolYear}년</span>
                  </div>
                </div>
                <Button className="w-full" size="lg" onClick={handleComplete}>
                  시작하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
