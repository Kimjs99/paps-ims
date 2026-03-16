# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
bun run dev           # 개발 서버 실행 — http://localhost:5174
bun run build         # 프로덕션 빌드
bun run preview --port 5174  # 빌드 결과 로컬 프로덕션 서버 (build 후 실행)
bun run lint          # ESLint 실행 (경고 0개 기준 유지)
bun run test          # 테스트 1회 실행 (Vitest)
bun run test:watch    # 테스트 워치 모드
bun run test:coverage # 커버리지 리포트 (목표: 80%+)

# 특정 테스트 파일 단독 실행
bun run test src/test/students.test.js
```

> 패키지 설치는 항상 `bun add` / `bun add -D` 사용. `npm`/`yarn` 사용 금지.

## 아키텍처 개요

**서버 없는 구조**: Google Sheets API v4가 유일한 DB. Firebase/Supabase 없음.
**인증**: 커스텀 OAuth 팝업 flow (`openOAuthPopup` → `oauth-callback.html` → postMessage) — 토큰은 `sessionStorage`에만 저장, `localStorage`에 저장 금지. GIS 라이브러리 미사용.
**상태**: Zustand persist 스토어 2개가 `localStorage`에 저장됨 — `paps-auth`(로그인 상태), `paps-settings`(Sheet ID·학교 정보).

## 핵심 데이터 흐름

```
openOAuthPopup() → oauth-callback.html(postMessage) → sessionStorage 토큰 저장
                                         ↓
sheetsRequest() → Authorization: Bearer {token} → Sheets API v4
                                         ↓
withRetry() — 429 시 지수 백오프(최대 3회), 401 시 즉시 throw
  ※ getValidToken() 무음 갱신 실패 시 AUTH_EXPIRED throw, fetch() AbortController 8초 타임아웃
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

- `deduplicateMeasurements()`는 `src/hooks/useDashboard.js`에서 export
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

## 스키마 버전 관리 (Phase 6)

앱 시작 시 `settings` 시트의 `SCHEMA_VERSION`을 확인해 불일치 시 마이그레이션 배너를 표시한다.

- `src/utils/schemaMigration.js` — 버전 비교(`needsMigration`), 마이그레이션 실행(`runMigrations`), `addColumnHeader` 헬퍼
- `src/hooks/useSchemaCheck.js` — sheetId 변경 시 자동 체크, `migrate()` 노출
- `src/components/layout/SchemaMigrationBanner.jsx` — AppLayout 헤더 하단에 렌더링
- 새 마이그레이션 추가 시 `schemaMigration.js`의 `MIGRATION_STEPS` 배열에 순서대로 추가 (`SCHEMA_VERSION` 상수도 함께 올릴 것)

## Google Sheets 스키마 규칙

- **시트 탭 이름은 영문 고정**: `students`, `measurements`, `grades_standard`, `settings`, `changelog` — 코드가 `SHEET_NAMES` 상수로 직접 참조
- **`settings` 시트 A열 키값 영문 고정**: `SCHEMA_VERSION`, `school_name`, `school_year`, `teacher_name`
- **컬럼 순서 변경 금지**: `students`·`measurements` 시트는 인덱스 기반 파싱
- **`students` 컬럼 순서** (9개): 학번, 이름, 성별, 학년, 반, 키(cm), 몸무게(kg), 등록일시, 활성여부 — `birth_date` 없음
- **`measurements` 컬럼 순서** (19개): measurement_id, student_id, year, cardio_type/value/grade, muscle_type/value/grade, flexibility_value/grade, agility_type/value/grade, bmi, bmi_grade, total_grade, measured_at, teacher_email
- **UUID는 클라이언트에서 생성**: `uuid` 라이브러리 사용
- **측정일시는 KST 저장**: `nowKST()` (`src/api/sheetsClient.js`) 사용 — `new Date().toISOString()` 직접 사용 금지 (UTC 저장됨)

## 라우팅 구조

`ProtectedRoute`는 `isAuthenticated && isOnboardingComplete` 둘 다 충족해야 통과.
모든 페이지는 `React.lazy`로 지연 로드되며 최상단 `<Suspense>`로 감싸져 있다.

```
/onboarding               — 5단계 온보딩 (인증 불필요, 즉시 로드)
/                         — Home (Protected)
/measure/:classId         — 반별 측정
/students                 — 학생 관리
/settings                 — 설정
/dashboard                — 대시보드 홈 (KPI·등급분포·학년진도)
/dashboard/overview       — 전체 분석 (레이더·성별비교·추이·BMI산점도)
/dashboard/class/:classId — 학급별 통계 (classId 없으면 학급 목록)
/dashboard/student/:id    — 학생 개별 조회 (id 없으면 검색 화면)
/dashboard/report         — 보고서 출력
```

## 환경변수

`.env` 파일 필수 (`.env.example` 참고). `VITE_` 접두사 없으면 클라이언트에서 접근 불가.

```
VITE_GOOGLE_CLIENT_ID   — OAuth 2.0 클라이언트 ID
VITE_GOOGLE_API_KEY     — Sheets API 키 (현재 코드에서 미사용 — 모든 API 호출은 OAuth 토큰으로 처리)
VITE_SHEETS_TEMPLATE_ID — 공개 템플릿 Sheet ID (사본 만들기용)
```

## 배포

**Vercel (현재 운영)**: 프로젝트 연결 후 환경변수 3개 등록, 빌드 명령 `bun run build`, 출력 디렉토리 `dist`. `base`는 `/`(기본값) 사용.
- SPA 라우팅은 `vercel.json` rewrites로 처리
- main 브랜치 push 시 Vercel 자동 배포 (GitHub Actions 워크플로우 없음)

**배포 후 필수**: Google Cloud Console → OAuth 클라이언트 → **승인된 JavaScript 원본**에 배포 도메인 등록.
- 등록 누락 시 OAuth 팝업이 `redirect_uri_mismatch` 또는 `popup_closed` 오류 반환

**배포 OAuth 이슈 (해결됨 v0.7.2)**: GIS implicit flow → 커스텀 팝업 flow로 교체 완료.
- 원인: `accounts.google.com` COOP `same-origin` 헤더로 인해 GIS 팝업→부모창 토큰 전달 차단
- 해결: `public/oauth-callback.html`(동일 origin 리디렉트 페이지)로 토큰 수신 후 `postMessage` 전달
- 추가 수정: `VITE_GOOGLE_CLIENT_ID` trailing newline → `.trim()` 적용, OAuth scope에 `openid profile email` 추가

## ESLint 규칙 주의사항

- `no-unused-vars`: `varsIgnorePattern: '^[A-Z_]'`, `argsIgnorePattern: '^[A-Z_]'` — 대문자 시작 변수·인자는 허용
- `react-hooks/set-state-in-effect`: useEffect 내부에서 setState 직접 호출 금지 — 비동기 콜백(`.then()`) 내부에서는 허용
- `react-refresh/only-export-components`: 훅과 컴포넌트를 같은 파일에서 export하면 경고 — 훅은 별도 파일로 분리
- `vite.config.js`는 Node 환경 — `eslint.config.js`에서 node globals 적용됨 (`process` 사용 가능)

## 개발 서버 관련 주의사항

- **dev/build 명령**: 반드시 `bun run dev` / `bun run build` 사용 — `vite` 직접 실행 시 `--configLoader native` 옵션 필요
- **무한 로딩 발생 시**: zombie esbuild 프로세스 누적 문제 → `ps aux | grep esbuild | grep UE` 로 확인 → UE 상태 프로세스 발견 시 **Mac 재부팅** 필요 (SIGKILL로 제거 불가)
- **서버 재시작**: `lsof -ti:5174 | xargs kill -9` 로 포트 정리 후 `bun run dev`

## 유틸리티 (`src/utils/`)

- `bmiCalc.js` — BMI 계산 및 등급 판정
- `gradeCalc.js` — 체력요소별 등급 계산 (grades_standard 기준)
- `validators.js` — Zod 스키마 기반 측정값 유효성 검사
- `pdfExport.js` — `exportElementToPdf`, `exportMultiPagePdf`, `exportAllPersonalCards`
- `excelExport.js` — `exportMeasurementsToExcel()` — xlsx 원시 데이터 내보내기
- `schemaMigration.js` — 스키마 버전 비교·마이그레이션 실행

## 컴포넌트 서브디렉토리 (`src/components/`)

- `ui/` — shadcn/ui 래퍼 컴포넌트 (수정 금지)
- `layout/` — AppLayout, DashboardLayout, ErrorBoundary, SchemaMigrationBanner
- `dashboard/` — KpiCard, DashboardFilters, GradeQuickFilter, LastUpdatedBar, PollingIndicator
- `charts/` — 대시보드용 Recharts 차트 컴포넌트
- `measurement/` — MeasurementStatusBadge 등 측정 입력 관련
- `report/` — ClassReportPreview, PersonalGrowthCard, RawDataExport

## 주요 주의사항 (버그 경험)

- **앱 시작 시 `initGoogleAuth()` 호출**: `App.jsx` useEffect에서 호출 — 현재는 `Promise.resolve()` no-op이나 향후 초기화 로직 추가 시 필요하므로 유지
- **Sheets API 불리언 반환값**: `"TRUE"` (대문자 문자열)로 반환됨 → `String(v).toLowerCase() !== "false"` 패턴 사용
- **Radix Select + react-hook-form `reset()`**: `reset()` 대신 `setValue()` 사용, Select에 `key={field.value}` 추가
- **grades_standard staleTime**: 5분. 데이터 변경 후 F5 새로고침 필요
- **서버 포트 좀비**: `lsof -ti:5174 | xargs kill -9` 로 정리
- **테스트 mock에서 `nowKST` 누락 주의**: `sheetsClient` mock 시 `nowKST: vi.fn(() => '...')` 반드시 포함 — 누락 시 이후 테스트까지 연쇄 오염
- **`vi.clearAllMocks()`는 `mockResolvedValueOnce` 큐를 초기화하지 않음**: 실패한 테스트가 소비되지 않은 mock 값을 남기면 이후 테스트에 영향
- **`useMutation` 에러 후 `isPending` 고착**: `mutateAsync` catch 블록에서 `mutation.reset()` 호출 필요 — 미호출 시 버튼이 "저장 중" 상태로 고착됨
- **OAuth 팝업 닫힘 감지**: `openOAuthPopup` 내부 polling이 `popup.closed` 접근 시 COOP `SecurityError` 발생 → try-catch로 억제. 팝업이 닫히면 `popup_closed` 에러 throw → 호출부에서 `AUTH_EXPIRED` 처리
- **아이콘 전용 버튼·링크**: `aria-label` 필수 — 없으면 스크린리더가 버튼 목적을 알 수 없음
- **`<Progress>` 컴포넌트**: `aria-label` 필수 — Radix UI progressbar role은 accessible name이 없으면 Lighthouse 경고 발생
- **`grades_standard` 시트 시드 미구현**: 템플릿 사본 생성 시 등급 기준 데이터가 비어있음 → 등급 계산 전부 `null` 반환. 온보딩 연동 테스트 후 자동 시드 구현 예정 (옵션 A, `.grades_standard_todo.md` 참고)

