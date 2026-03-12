# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
bun run dev           # 개발 서버 실행 — http://localhost:5174
bun run build         # 프로덕션 빌드
bun run lint          # ESLint 실행 (--max-warnings=0 기준으로 유지)
bun run preview       # 빌드 결과 미리보기
bun run test          # 테스트 1회 실행 (Vitest)
bun run test:watch    # 테스트 워치 모드
bun run test:coverage # 커버리지 리포트 (목표: 80%+)
```

> 패키지 설치는 항상 `bun add` / `bun add -D` 사용. `npm`/`yarn` 사용 금지.

## 아키텍처 개요

**서버 없는 구조**: Google Sheets API v4가 유일한 DB. Firebase/Supabase 없음.
**인증**: Google Identity Services(GIS) implicit flow — 토큰은 `sessionStorage`에만 저장, `localStorage`에 저장 금지.
**상태**: Zustand persist 스토어 2개가 `localStorage`에 저장됨 — `paps-auth`(로그인 상태), `paps-settings`(Sheet ID·학교 정보).

## 핵심 데이터 흐름

```
GIS 팝업 → tokenClient.callback → sessionStorage 토큰 저장
                                         ↓
sheetsRequest() → Authorization: Bearer {token} → Sheets API v4
                                         ↓
withRetry() — 429 시 지수 백오프(최대 3회), 401 시 즉시 throw
                                         ↓
useSheets() (TanStack Query) — staleTime 30s, refetchInterval 30s
```

## 대시보드 데이터 파이프라인

대시보드는 항상 다음 순서로 데이터를 처리한다. 순서를 바꾸면 비활성 학생이 통계에 포함되는 버그가 재발한다.

```
allStudents → activeStudents (is_active 필터)
                    ↓
allMeasurements → active 학생 측정값만 추출
                    ↓
deduplicateMeasurements() — (student_id, year) 단위로 체력요소별 최우수 등급 병합
                    ↓
URL 필터(year/grade/class/gender) 적용 → filtered
                    ↓
KPI / 차트 계산
```

- `deduplicateMeasurements()`는 `src/hooks/useDashboard.js`에서 export — 동일 학생의 중복 측정 레코드를 병합할 때 직접 임포트해 사용 가능
- 등급 체계: **1등급이 최우수, 5등급이 최하** (낮을수록 좋음) — 차트 Y축 반전 또는 값 반전(`6 - grade`) 필요
- 대시보드 필터는 URL 쿼리 파라미터(`useSearchParams`) 기반 — `useDashboardFilters()` 훅으로 읽음

## 보고서 데이터 파이프라인

보고서(`/dashboard/report`)는 대시보드와 달리 **최우수 병합이 아닌 평균값** 기반이다.

```
raw measurements (원시 전체)
        ↓
필터(year/grade/class) 적용
        ↓
student_id별 그룹핑 → 체력요소별 평균 등급(Math.round) → reportMeasurements
        ↓
ClassReportPreview / PersonalGrowthCard
```

- `deduplicateMeasurements()`를 보고서에 사용하면 최우수 병합이 발생해 데이터가 왜곡됨 — **보고서에는 절대 사용 금지**
- `PersonalGrowthCard`의 `yearlyTrend`도 연도별 평균 total_grade를 표시

## Google Sheets 스키마 규칙

- **시트 탭 이름은 영문 고정**: `students`, `measurements`, `grades_standard`, `settings`, `changelog` — 코드가 `SHEET_NAMES` 상수로 직접 참조
- **`settings` 시트 A열 키값 영문 고정**: `SCHEMA_VERSION`, `school_name`, `school_year`, `teacher_name`
- **컬럼 순서 변경 금지**: `students`·`measurements` 시트는 인덱스 기반 파싱 — 순서 변경 시 기존 사본 Sheet 파괴
- **`students` 컬럼 순서** (9개): 학번, 이름, 성별, 학년, 반, 키(cm), 몸무게(kg), 등록일시, 활성여부 — `birth_date` 없음
- **`measurements` 컬럼 순서** (19개): measurement_id, student_id, year, cardio_type/value/grade, muscle_type/value/grade, flexibility_value/grade, agility_type/value/grade, bmi, bmi_grade, total_grade, measured_at, teacher_email
- **UUID는 클라이언트에서 생성**: `uuid` 라이브러리 사용
- **측정일시는 KST 저장**: `nowKST()` (`src/api/sheetsClient.js`) 사용 — `new Date().toISOString()` 직접 사용 금지 (UTC 저장됨)

## 라우팅 구조

`ProtectedRoute`는 `isAuthenticated && isOnboardingComplete` 둘 다 충족해야 통과.

```
/onboarding               — 5단계 온보딩 (인증 불필요)
/                         — Home (Protected)
/measure/:classId         — 반별 측정 (Phase 2)
/students                 — 학생 관리 (Phase 2)
/settings                 — 설정 (Phase 2)
/dashboard                — 대시보드 홈 (KPI·등급분포·학년진도)
/dashboard/overview       — 전체 분석 (레이더·성별비교·추이·BMI산점도)
/dashboard/class/:classId — 학급별 통계 (classId 없으면 학급 목록)
/dashboard/student/:id    — 학생 개별 조회 (id 없으면 검색 화면)
/dashboard/report         — 보고서 출력 (Phase 5)
```

## 환경변수

`.env` 파일 필수 (`.env.example` 참고). `VITE_` 접두사 없으면 클라이언트에서 접근 불가.

```
VITE_GOOGLE_CLIENT_ID   — OAuth 2.0 클라이언트 ID
VITE_GOOGLE_API_KEY     — Sheets API 키 (웹사이트 제한 + Sheets API 제한 설정)
VITE_SHEETS_TEMPLATE_ID — 공개 템플릿 Sheet ID (사본 만들기용)
```

## ESLint 규칙 주의사항

- `no-unused-vars`: `varsIgnorePattern: '^[A-Z_]'`, `argsIgnorePattern: '^[A-Z_]'` — 대문자 시작 변수·인자는 허용
- `react-hooks/set-state-in-effect`: useEffect 내부에서 setState 직접 호출 금지 — 초기값은 `state ?? derivedDefault` 패턴으로 render-time에 파생
- `react-refresh/only-export-components`: 훅과 컴포넌트를 같은 파일에서 export하면 경고 — 훅은 별도 파일로 분리

## 개발 서버 관련 주의사항

- **dev/build 명령**: 반드시 `bun run dev` / `bun run build` 사용 — `vite` 직접 실행 시 `--configLoader native` 옵션 필요
- **무한 로딩 발생 시**: zombie esbuild 프로세스 누적 문제 → `ps aux | grep esbuild | grep UE` 로 확인 → UE 상태 프로세스 발견 시 **Mac 재부팅** 필요 (SIGKILL로 제거 불가)
- **서버 재시작**: `lsof -ti:5174 | xargs kill -9` 로 포트 정리 후 `bun run dev`

## 유틸리티 (`src/utils/`)

- `bmiCalc.js` — BMI 계산 및 등급 판정
- `gradeCalc.js` — 체력요소별 등급 계산 (grades_standard 기준)
- `validators.js` — Zod 스키마 기반 측정값 유효성 검사
- `pdfExport.js` — `exportElementToPdf(elementId, filename)` — DOM → jsPDF 변환
- `excelExport.js` — `exportMeasurementsToExcel()` — xlsx 원시 데이터 내보내기

## 컴포넌트 서브디렉토리 (`src/components/`)

- `ui/` — shadcn/ui 래퍼 컴포넌트 (수정 금지)
- `layout/` — 공통 레이아웃 (Router 종속)
- `dashboard/` — KpiCard, DashboardFilters, GradeQuickFilter, LastUpdatedBar, PollingIndicator
- `charts/` — 대시보드용 Recharts 차트 컴포넌트
- `measurement/` — MeasurementStatusBadge 등 측정 입력 관련
- `report/` — ClassReportPreview, PersonalGrowthCard, RawDataExport

## 주요 주의사항 (버그 경험)

- **앱 시작 시 `initGoogleAuth()` 필수**: `App.jsx` useEffect에서 호출. 누락 시 새로고침 후 `AUTH_NOT_INITIALIZED` 오류
- **Sheets API 불리언 반환값**: `"TRUE"` (대문자 문자열)로 반환됨 → `String(v).toLowerCase() !== "false"` 패턴 사용 (`is_active` 파싱)
- **Radix Select + react-hook-form `reset()`**: `reset()` 대신 `setValue()` 사용, Select에 `key={field.value}` 추가
- **grades_standard staleTime**: 5분. Apps Script로 데이터 변경 후 F5 새로고침 필요
- **서버 포트 좀비**: `lsof -ti:5174 | xargs kill -9` 로 정리
- **Vercel 배포**: 자동 배포 없음 — PR merge 또는 수동 트리거 필요

## 개발 단계 참조

`../files/` 디렉토리에 단계별 스펙 파일이 있음. 코드 작성 전 해당 Phase 파일 반드시 참조.

| 파일 | 내용 | 상태 |
|------|------|------|
| `02_webapp_input.md` | Phase 2 — 학생 관리, 측정 입력, Zod 스키마 | ✅ 완료 |
| `03_dashboard_basic.md` | Phase 3 — 대시보드 기본 | ✅ 완료 |
| `04_analytics.md` | Phase 4 — 분석 고도화 | ✅ 완료 |
| `05_report_export.md` | Phase 5 — 보고서 출력 | ✅ 완료 |
| `06_schema_mgmt.md` | Phase 6 — 스키마 버전 관리 | 🔲 |
| `07_qa_deploy.md` | Phase 7 — QA·배포 | 🔲 |
