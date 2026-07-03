# Changelog

All notable changes to this project will be documented in this file.

## [v0.16.0] - 2026-07-03

### ✨ Features (전수 리뷰 잔여 백로그 완결)
- **설정에서 학교급 변경 지원** — 학교 정보 카드에 학교급 Select 추가. 변경 저장 시 확인 다이얼로그를 거쳐 grades_standard 기준표를 새 학교급 공식 기준으로 재시드(재시드 성공 후에만 학교급 저장 — 실패 시 기존 학교급 유지), 완료 후 "재계산" 안내
- **기준표 시드 원자성 개선** — clear→PUT 순서를 PUT→잔행 clear로 교체. 중간 실패 시 기준표가 빈 채로 남던 창 제거(어느 단계에서 실패해도 완전한 기준표 유지, 잔행은 find 우선순위상 무해)
- **측정 라우트 param 변경 시 강제 재마운트** — `/measure/:classId`(·`/:studentId`)에 key 부여. 학급→학급 직행 내비게이션에서 "프리필 1회" 가드가 리셋되지 않아 이전 학급 폼이 남는 잠재 결함 차단
- **CSV 오류 행 번호 정확화** — `parseCsvWithLines`(원본 파일 행 번호 보존) 신규, 학생 CSV 업로드 오류 안내가 파일 중간 빈 줄이 있어도 실제 행을 가리키도록 수정

### ✅ Tests
- Vitest 327 → **339 케이스**: parseCsvWithLines(빈 줄·BOM·CRLF·행 번호), seedGradesStandard(PUT 선행·범위 산식·PUT 실패 시 clear 미호출·문자열 직렬화·미지원 학교급)

## [v0.15.0] - 2026-07-03

### ✨ Features
- **BMI 공식 학년·성별 기준 적용** — 성인 기준(18.5/23/25/30) 하드코딩을 교육부 PAPS 도움자료의 학년별(초4~고3)·성별 판정표로 교체. `BMI_STANDARDS_BY_LEVEL` 상수(`utils/bmiCalc.js`) + `calcBMIGrade(bmi, {schoolLevel, grade, gender})`. 등급 매핑은 기존 유지: 1 정상 / 2 과체중 / 3 경도비만 / 4 마름 / 5 고도비만
  - 남 고2·고3은 공식표에 과체중 구간 없음(25.0~29.9 전체가 경도비만) — 정상 상한=과체중 상한(24.9)으로 인코딩
  - 초등 3학년은 공식 기준 미제공 → BMI 등급 미산출(null), 종합등급은 나머지 4개 영역 평균
  - `buildGrades(options.schoolLevel)` 배선: 측정 미리보기(useCalculateGrades)·학급 저장(buildMeasurementRows)·설정 재계산 3경로. 기존 측정 기록은 설정 → 재계산으로 일괄 갱신
- **각주 교체** — 측정 미리보기·학급 보고서의 "참고치(성인 기준)" 각주를 공식 기준 적용 안내로 교체(기준 미제공 학년 안내 포함)

### ✅ Tests
- BMI 경계값(중1 남 8구간·초4 여·남 고2/고3 병합 구간·고3 여), 초3 null, 기준표 무결성(단조성·29.9 상한·18항목 커버리지), buildGrades schoolLevel 배선

## [v0.14.0] - 2026-07-03

### ✨ Features (정책 백로그 배치)
- **스키마 v1.1 — 측정 당시 학년 기록** — measurements 시트 T열 `measured_grade` 추가(마이그레이션 배너에서 사용자 승인 시 적용). 저장 시 학년 기록, 등급 재계산 시 측정 당시 학년 기준표 사용(구 데이터는 현재 학년 폴백 — 한계 명시). 마이그레이션 전에도 저장 동작에 지장 없음
- **구버전 시트 연결 허용** — 온보딩·설정의 시트 검사를 `checkSchemaCompat`로 완화: 구버전(마이그레이션 가능) 시트는 연결 허용 후 배너에서 업그레이드, 앱보다 신버전만 거부. (기존 엄격 일치 검사는 v1.1 배포 시 신규 온보딩을 전면 차단하는 문제가 있었음 — 적대적 검증에서 발견)
- **마이그레이션 배너 대시보드 노출** — `SchemaMigrationBanner`를 DashboardLayout에도 추가
- **초등 학년 범위 3~6 제한** — PAPS 기준표 존재 학년만 등록 허용(1~2학년은 평가 대상 아님). 스키마 하한도 범위 기반으로 수정
- **대시보드 학년 필터 학교급 반영** — `[1,2,3]` 하드코딩 → 학교급 범위(초등 4~6학년 필터 가능해짐, 기존 버그)
- **BMI 참고치 표기** — 측정 미리보기·학급 보고서에 "BMI 등급은 참고치(성인 기준)" 각주. 공식 학년·성별 기준표 확보 시 정확 반영 예정(웹 공개 자료로는 신뢰 가능한 학년별 수치 확보 불가)

### 📝 Docs
- `docs/운영가이드_개인정보.md` 신규 — 시트 공유 설정·OAuth 스코프 고지·데이터 최소화·사고 대응·가정통신문 문구
- PKCE 전환 결론 기록 — 브라우저 전용(서버리스) 구조에서는 Google이 client_secret을 요구해 성립 불가, 백엔드 도입 시 재검토

### ✅ Tests
- Vitest 320 → **327 케이스**: measured_grade 저장·20컬럼 파싱·구 19컬럼 하위호환, checkSchemaCompat 4상태, 초등 3~6 스키마 경계

## [v0.13.0] - 2026-07-03

### ♻️ Refactoring (동작 변경 0 — 적대적 검증 확인)

**중복 통합**
- **등급 계산 단일화** — ClassMeasure·StudentMeasure(미리보기+저장)·Settings(재계산) 4중 복제를 `buildGrades(formValues, student, gradesData, options)` 하나로 통합. `options.bmi`로 재계산 시 측정 당시 BMI 이력 보존(v0.12.1 수정 유지)
- **`FITNESS_AREAS` 상수화** — 5개 체력요소(키/라벨/필드) 재선언 9곳 → `constants/paps.js` 단일 정의. 화면별 표기 차이는 label/labelAlt/labelFull로 보존
- **평균 유틸** — `utils/stats.js` 신규(`avgOf`/`avgFixed1`/`avgRounded`), 5곳 배선 — 사이트별 반올림·출력 타입 그대로
- **CSV 유틸** — `utils/csv.js` 신규(따옴표 인식 파서·BOM 옵션 다운로드), ClassMeasure·Students 배선
- **`useLogout` 훅 + `ThemeToggle` 컴포넌트 추출** — AppLayout·DashboardLayout·Settings 3중 복제 제거

**대형 페이지 분해** (동작·DOM·className 불변)
- **ClassMeasure 498→281줄** — `classMeasureCsv.js`·`classMeasureForm.js`(순수 함수) + `ClassMeasureTypeSelects`·`ClassMeasureTable`(컴포넌트). 프리필 1회 가드·dirty 저장·beforeunload는 페이지에 원문 유지
- **StudentDetail 486→188줄** — `studentDetailData.js` + `StudentSearch`·`StudentHistoryTable`·`StudentAvgGradeCards`
- **Report 443→217줄** — `reportData.js`(활성 필터 선행·평균 계약 명문화) + `ReportFilters`·`ClassReportTab`·`PersonalCardsTab` + `useReportExports` 훅

### ✅ Tests
- Vitest 211 → **320 케이스** (+109): 시드 단조성 26(3개 학교급 전수 — 이상 0건), stats 9, csv 11(라운드트립), classMeasureCsv/Form 21, studentDetailData 22, reportData 17(평균≠최우수 병합 명시 검증), gradeCalc +3

## [v0.12.2] - 2026-07-03

### 🔧 Chores (위생 배치)
- **xlsx 0.18.5 → 0.20.3** — 알려진 CVE(Prototype Pollution·ReDoS) 해소, SheetJS 공식 CDN tarball로 교체
- **미사용 radix 패키지 4종 제거** — `dropdown-menu`·`separator`·`tabs`·`toast` (토스트는 자체 `toastStore`+`Toaster` 구현 사용 중)
- **죽은 코드 제거** — `src/api/changelog.js`(import 0건) + `SHEET_NAMES.CHANGELOG` 키
- **`.env.example` 정리** — 미사용 `VITE_GOOGLE_API_KEY` 제거 (모든 API 호출은 OAuth 토큰)
- **`files/` gitignore 추가** — 더미 CSV 트래킹 방지
- **버전 규칙 명문화** — package.json `version`을 CHANGELOG와 동기화(0.7.0 → 0.12.x), 규칙 CLAUDE.md 기록

## [v0.12.1] - 2026-07-03

### 🐛 Bug Fixes (전수 리뷰 버그 배치 — 입력 손실 / 정확성 / 인증·동시성)

**입력 손실 방지**
- **30초 폴링 폼 리셋 제거** — 측정 입력 중 refetch(폴링·창 포커스)가 폼·종목 선택을 서버값으로 되돌리던 문제. `useMeasurements(sheetId, { poll })` 옵션 + 프리필 1회 가드(`initializedRef`)로 입력 보존 (`StudentMeasure`·`ClassMeasure`)
- **학급 재저장 전원 중복 append 방지** — 프리필 스냅샷(baseline) 대비 변경(dirty)된 학생만 저장. 종목(Select)만 바꿔도 해당 영역 값이 있는 행은 재저장 대상 (`classMeasureDirty.js` 신규 순수 함수 + 테스트)
- **미저장 이탈 경고** — 저장 대상 판정과 동일 기준의 `beforeunload` 경고 추가

**정확성**
- **NaN 저장 방지** — 측정값 파서 `toNumOrNull`로 빈 값/비숫자 안전 처리 (`api/measurements.js`)
- **등급 재계산 시 BMI 이력 보존** — 일괄 재계산이 기존 BMI 값을 유실하던 문제 수정 (`Settings`)
- **초등 4~6학년 등록 불가 수정** — 학교급별 학년 범위(`makeStudentSchema(schoolLevel)` 팩토리 + `GRADE_RANGE_BY_LEVEL`)로 Zod 스키마·CSV 업로드·대시보드 학년 진도 일원화
- **보고서 비활성 학생 혼입 수정** — `Report` 집계 전 활성 학생 필터 선행
- **`endurance_run` 유효 범위 키 정정** (`constants/paps.js`)
- **CSV 업로드 Zod 검증** — `safeParse`로 행 단위 오류 수집·표시 (`Students`)
- **기준표 시드 잔행 방지** — 시드 전 `A1:I:clear`, 온보딩 완료 시 `grades_standard` 쿼리 무효화 (`gradesStandard`·`Onboarding`)

**인증·동시성**
- **토큰 만료 강제 로그아웃 제거** — 백그라운드 갱신 실패 시 페이지 이동 없이 재로그인 배너 표시(입력값 보존), 사용자 제스처 시점 팝업으로 차단 없이 재인증 (`AuthExpiredBanner` 신규, `App`·`authStore`)
- **토큰 갱신 경쟁 제거** — `getValidToken` in-flight Promise 공유(mutex), 갱신 실패 시 token+expiry 동시 정리 (`sheetsClient`)
- **rowIndex 동시성 가드** — 쓰기 직전 key 컬럼 재조회·대조 후 불일치 시 중단(`ROW_MISMATCH`): `updateStudent`·`batchUpdateMeasurementGrades`·`deleteClassHard`(재계산 대조 후 내림차순 삭제) (`api/rowGuard.js` 신규)
- **Sheets 오류 메시지 견고화** — 비JSON 오류 응답(HTML 등) 폴백 처리 (`sheetsClient`)

### ✅ Tests
- Vitest 185 → **211 케이스** (+26): dirty 선별·종목 변경 재저장, 토큰 mutex, ROW_MISMATCH 3종, deleteClass 가드 6종, authExpired 스토어, 낡은 테스트 4건 계약 갱신(AUTH_EXPIRED·height/weight undefined)

## [v0.12.0] - 2026-03-22

### ✨ Features
- **주간/야간/자동 화면 모드 토글 추가** — 앱 헤더 및 대시보드 헤더에 ☀/🖥/🌙 3버튼 토글 추가, `useTheme` 훅으로 `<html>` 에 `.dark` 클래스 적용·시스템 설정 자동 감지, 사이드바·탭바·헤더·푸터 다크 모드 스타일 일괄 적용 (2a51fdf)

## [v0.11.0] - 2026-03-22

### ✨ Features
- **학생 개별 조회 측정 기록 개선** — 등급만 표시하던 테이블에 실측값(회/kg/cm/초) 추가, 헤더에 종목명·단위 표기(최신 측정 기준), 마지막 행에 전체 기간 평균값·평균 등급 행 추가 (5e8dd5c)

## [v0.10.0] - 2026-03-22

### ✨ Features
- **키/몸무게 선택 입력** — 학생 등록 시 키/몸무게 필수 → 선택으로 변경, 미입력 시 학생 목록에 `-` 표시 (3be5244)
- **반별 측정 목록에 키/몸무게 컬럼 추가** — 성별 옆에 키(cm)·몸무게(kg) 입력 필드 추가, 저장 시 학생 정보 자동 업데이트 및 BMI 반영 (3be5244)
- **개별 측정 폼 신체정보 편집** — 기본 정보 카드를 편집 가능한 입력 필드로 교체, 키/몸무게 입력 시 BMI·등급 실시간 계산 (3be5244)
- **측정 CSV 템플릿 키/몸무게 컬럼 추가** — 템플릿에 키(cm)·몸무게(kg) 컬럼 추가, 기존 등록값 미리 채움 (신규 학생은 빈 칸), CSV 업로드 파서도 신 컬럼 순서 대응 (3be5244)

## [v0.9.0] - 2026-03-18

### ✨ Features
- **홈 학급 완전 삭제** — 학급 카드 호버 시 휴지통 버튼 표시, 학급명 직접 입력 확인 후 학생·측정 데이터 영구 삭제 (`api/deleteClass.js` 신규, `batchUpdate deleteDimension` 활용) (092b129)
- **측정 등급 일괄 재계산** — 설정 → 데이터 관리 → "재계산" 버튼으로 grades_standard 기준표 업데이트 후 기존 측정 기록의 null 등급 일괄 재계산·저장 (092b129)

### 🔧 Chores
- `api/measurements.js` — `batchUpdateMeasurementGrades` 함수 추가 (values.batchUpdate로 다중 행 업데이트) (092b129)
- `hooks/useSheets.js` — `useDeleteClassHard` mutation 추가 (092b129)

## [v0.8.0] - 2026-03-18

### ✨ Features
- **학생/학급 비활성화(삭제)** — 학생 행 휴지통 버튼으로 개별 비활성화, 학년·반 필터 선택 시 "학급 전체 비활성화" 버튼 표시, 확인 다이얼로그 후 처리 (측정 이력 보존 소프트 삭제)
- **측정 일괄 등록 템플릿** — ClassMeasure 상단 "템플릿" 버튼으로 현재 학급 학생 사전입력 CSV 다운로드(BOM 포함, Excel 한글 정상 표시), "CSV 업로드" 버튼으로 작성된 값 화면 반영 후 일괄 저장
- **온보딩 학교급 선택** — Step 4에 초등학교/중학교/고등학교 선택 추가, 완료 시 `grades_standard` 시트가 비어있으면 해당 학교급 PAPS 기준 데이터 자동 시드
- **PAPS 공식 등급 기준 자동 등록** — `PAPS_평가기준표.xlsx` 교육부 공식 자료 기반 등급 임계값 (`src/utils/gradesStandardSeed.js` 신규), 초등 3~6학년·중학교 1~3학년·고등학교 1~3학년 × 성별(M/F) × 8종목, `endurance_run` 분:초 → 초 단위 자동 변환

### 🔧 Chores
- `src/api/gradesStandard.js` 신규 — `isGradesStandardEmpty`, `seedGradesStandard` API
- `settingsStore` `schoolLevel` 필드 추가 (기본값: 중학교)
- `api/students.js` — `deactivateStudent`, `deactivateClassStudents` 추가
- `hooks/useSheets.js` — `useDeactivateStudent`, `useDeactivateClassStudents` 추가

### 📝 Documentation
- `grades_standard_todo.md` 완료 처리 — 시드 구현 완료 기록

## [v0.7.4] - 2026-03-17

### ♻️ Refactoring
- `sheetsClient` catch 범위 축소 — `SecurityError`만 무시, 나머지 예외 re-throw (a216183)
- `VITE_GOOGLE_CLIENT_ID?.trim() || ""` optional chaining으로 수정 (a216183)

### 📝 Documentation
- CLAUDE.md 현행화 — GIS → 커스텀 OAuth 팝업 flow, `VITE_GOOGLE_API_KEY` 미사용 표기 (c80b795)
- 교사 사용가이드 초심자 버전 추가 (`docs/교사_사용가이드_초심자.md`) — 준비물부터 보고서 출력까지 단계별 상세 안내 (941fdf4)

## [v0.7.3] - 2026-03-16

### 📝 Documentation
- 배포 URL 고정 프로덕션 도메인(`paps-ims.vercel.app`)으로 통일 — README, 교사_사용가이드 (1bebb90)

### 🔧 Chores
- `public/404.html` 삭제 — GitHub Pages SPA 리디렉트 파일, Vercel에서 불필요 (b3483f0)
- `.github/workflows/` 빈 디렉토리 삭제 (b3483f0)
- `README.md` GitHub Pages/Actions 언급 제거 (b3483f0)

## [v0.7.2] - 2026-03-16

### 🐛 Bug Fixes
- OAuth scope에 `openid` · `profile` · `email` 추가 — userinfo 401 오류 해결 (4d20ae7)
- `VITE_GOOGLE_CLIENT_ID` `.trim()` 적용 — Vercel 환경변수 trailing newline(`%0A`) 인코딩으로 인한 `invalid_client` 오류 해결 (1fe78d0)
- `initGoogleAuth` GIS 의존성 제거 — 커스텀 OAuth 팝업 flow 전환 후 GIS 미로드 시 초기화 실패 수정 (9526084)

### ✨ Features
- GIS COOP 이슈 해결 — 커스텀 OAuth 팝업 flow(`oauth-callback.html` + postMessage) 도입으로 Vercel HTTPS 환경 로그인 정상화 (edc3999)

## [v0.7.1] - 2026-03-14

### 🔧 Chores
- GitHub Pages 워크플로우 제거 — Vercel 단독 운영으로 전환 (2fcca76)
- Vercel 배포 OAuth 로그인 이슈 디버깅 후 원복 — v0.7.0 클린 상태 유지 (87eafbf)

## [v0.7.0] - 2026-03-14

### ✅ QA 완료
- 수동 QA 시나리오 A~F 전체 통과 (온보딩·측정 입력·네트워크 오류·대시보드 폴링·보고서 출력·스키마 마이그레이션)
- Chrome · Safari · Edge 크로스 브라우저 테스트 완료
- Lighthouse 성능·접근성·SEO 측정 완료 — Accessibility 93점 유지

### 💄 Style
- AppLayout·DashboardLayout 하단 푸터 추가 — 저작권 및 개발자 표기

## [v0.6.3] - 2026-03-14

### 🐛 Bug Fixes
- GIS `requestAccessToken` `error_callback` 누락으로 OAuth 팝업 닫힘 시 로그인 버튼 loading 고착 수정 (e54d204)
- `getValidToken` silent refresh에도 동일하게 `error_callback` 추가 (e54d204)

## [v0.6.2] - 2026-03-14

### 🐛 Bug Fixes
- vercel.json SPA 라우팅 설정 추가 — /onboarding 등 직접 접근 시 404 수정 (8a28d62)

### 📝 Documentation
- README.md 정리 — Vercel 배포 URL, 환경변수 테이블 추가 (fe49d8f)
- CLAUDE.md 개선 — Vercel 배포, 접근성 주의사항, Phase 7 완료 반영 (69cd2a3)

### 🔧 Chores
- .gitignore에 .vercel 추가 (Vercel CLI 자동 생성) (0336c92)

## [v0.6.1] - 2026-03-14

### ♿ Accessibility
- 아이콘 버튼 `aria-label` 추가 — 로그아웃, 설정, 뒤로 가기 (f313ed3)
- `<Progress>` 컴포넌트 `aria-label` 추가 — 학급 측정 진행률, 온보딩 단계 (f313ed3)
- 프로필 이미지 `alt` 속성 추가 — AppLayout, DashboardLayout, Settings (f313ed3)
- Home.jsx 헤딩 순서 수정 — h1→h3 스킵 → h1→h2 (f313ed3)
- Lighthouse Accessibility 93점 달성 (목표 90 초과)

### 📝 Documentation
- README.md 기본 내용 작성 — 빠른 시작, 기술 스택, 배포 안내 (f313ed3)
- CLAUDE.md Phase 6·7 완료 반영, 주의사항 보완 (f313ed3)

### 🔧 Chores
- `src/assets/` 빈 디렉토리 제거 (f313ed3)
- `.DS_Store` 제거 (f313ed3)

## [v0.6.0] - 2026-03-14

### ✨ Features
- Phase 6 스키마 버전 관리 구현 — `schemaMigration.js`, `useSchemaCheck.js`, `SchemaMigrationBanner` (신규)
- Phase 7 QA·배포 구현 — ErrorBoundary, React.lazy 코드 분할, Vite manualChunks (recharts/xlsx/jspdf)
- GitHub Actions 자동 배포 워크플로우 추가 (`.github/workflows/deploy.yml`)
- SPA 라우팅 — `public/404.html` 리디렉션 트릭, `index.html` 경로 복원 스크립트
- Settings 페이지 — 시스템 정보 카드 (앱 버전, 스키마 버전, Sheet ID, 버전 재확인 버튼)

### 🐛 Bug Fixes
- `getValidToken()` 8초 타임아웃 추가 — 오프라인 시 인증 무한 대기 해소
- `sheetsRequest()` AbortController 8초 타임아웃 추가 — fetch 무한 대기 해소
- `ClassMeasure` 오프라인 저장 후 버튼 "저장 중" 고착 — `saveBatch.reset()` 호출로 수정
- `PersonalGrowthCard` 연도별 추이 섹션 조건 수정 (`yearlyTrend.length > 0`)
- `PersonalGrowthCard` PDF 과도한 여백 — `minHeight: "210mm"` 제거

### ✅ Tests
- `students.test.js`, `measurements.test.js` sheetsClient mock에 `nowKST` 누락 수정 — 테스트 165개 전체 통과

### 🔧 Chores
- `vite.config.js` — CI 환경(`GITHUB_ACTIONS`) base 경로 자동 설정
- `eslint.config.js` — `vite.config.js`에 node globals 적용 (`process` 허용)
- `Report.jsx` — `REPORT_GRADE_KEYS` 모듈 레벨로 이동 (ESLint useMemo 경고 해소)

### 📝 Documentation
- CLAUDE.md 전면 개정 — Phase 6·7 완료 반영, 스키마 버전 관리·배포·타임아웃 섹션 추가
- 교사 사용 가이드 (`docs/교사_사용가이드.md`) 신규 작성

## [v0.5.1] - 2026-03-13

### 🐛 Bug Fixes
- 인쇄 시 사이드바·헤더 숨김, PDF 페이지 초과 콘텐츠 분할 처리 (4e56fdf)

### 📝 Documentation
- CLAUDE.md 보고서 데이터 파이프라인 섹션 추가 (c3eaaec)

## [v0.5.0] - 2026-03-13

### ✨ Features
- 보고서 개인 기록 평균값 산출 — PersonalGrowthCard·ClassReportPreview 최우수 병합 → 전체 측정 평균 등급으로 변경 (4f2c6a6)

### 📝 Documentation
- CLAUDE.md 업데이트 — Phase 5 완료 반영, utils/컴포넌트 서브디렉토리 구조 추가 (207900b)

## [v0.4.0] - 2026-03-12

### ✨ Features
- Phase 5 보고서 출력 구현 — jsPDF, html2canvas, xlsx 기반 PDF·엑셀 내보내기 (5690f27)

### 📝 Documentation
- README.md 추가 (b9290e2)

## [v0.3.1] - 2026-03-12

### 💄 Style
- GradeDistributionChart Y축 `~명` 단위 추가 (d57fe9b)
- YearlyTrendChart·BmiScatterChart 상단 여백 추가 — 1등급 레이블 잘림 수정 (d57fe9b)
- GenderComparisonChart Y축 `~등급` 전체 표기, 막대 위 소수점 1자리 수치 표기 (d57fe9b)

## [v0.3.0] - 2026-03-12

### ✨ Features
- Phase 3·4 대시보드 전체 구현 — DashboardLayout, KpiCard, DashboardFilters, GradeQuickFilter (4edf5af)
- 차트 6종 신규 구현 — GradeDistribution, GradeProgress, AreaRadar, YearlyTrend, GenderComparison, BmiScatter (4edf5af)
- useDashboard 훅 — deduplicateMeasurements, URL 기반 필터, useGenderComparison, useYearlyTrend 등 (4edf5af)
- DashboardHome, Overview, ClassDetail, StudentDetail 페이지 구현 (4edf5af)
- StudentDetail: 영역별 평균 등급, 측정일자별 추이, 연도 선택, 전체 측정 이력 표시 (4edf5af)
- ClassDetail: 학생별 평균 히스토그램("체력요소별 평균 분포"), deduplicateMeasurements 적용 (4edf5af)
- GenderComparisonChart 정방향 막대 그래프, 막대 위 수치 표기, 소수점 1자리 (4edf5af)
- nowKST() 헬퍼 추가 — measurements/students/changelog API 측정일시 KST(+09:00) 저장 (4edf5af)

### 🐛 Bug Fixes
- is_active 파싱 버그 수정: Sheets API "FALSE" 대소문자 처리 (4edf5af)
- 통계 기준 오류 수정: activeStudents 먼저 확정 후 deduped 기반 집계 (4edf5af)
- StudentDetail height/weight 필드명 오류 수정 (4edf5af)

### 📝 Documentation
- CHANGELOG.md v0.2.1 추가 (1669ba2)

## [v0.2.1] - 2026-03-11

### 📝 Documentation
- CLAUDE.md 주의사항 추가 및 Phase 진행 상태 업데이트, 테스트 명령어 추가 (12787f5)

### 🔧 Chores
- Vite 템플릿 잔재 파일 정리 및 파비콘 수정 (61f0607)

## [v0.2.0] - 2026-03-11

### ✨ Features
- Phase 2 입력 시스템 완성 — 학급 측정, 상세 측정, 학생 관리, 설정 페이지 구현 (5133a8b)
- CSV 템플릿 다운로드 버튼 추가 (24874a9)
- 기존 저장된 측정값 폼 자동 복원 (ClassMeasure, StudentMeasure) (24874a9)

### 🐛 Bug Fixes
- 새로고침 후 AUTH_NOT_INITIALIZED 오류 수정 — 앱 시작 시 initGoogleAuth 호출 (24874a9)
- grades_standard higher_is_better 파싱 수정 — Sheets API 대문자 TRUE/FALSE 처리 (24874a9)
- Select 종목 표시 오류 수정 — key prop으로 강제 리마운트 (24874a9)
- 등록 실패 에러 메시지 구체화 (24874a9)
- grades_standard staleTime 1시간 → 5분으로 단축 (24874a9)

### ✅ Tests
- Vitest 환경 구성 및 테스트 165개 추가, 커버리지 82% (9d97121)

### 📝 Documentation
- CLAUDE.md 추가 — 개발 환경, 아키텍처, Sheets 스키마 규칙 (e9f15a2)

### 🔧 Chores
- coverage 디렉토리 gitignore 추가 (960caa3)

## [v0.1.0] - 2026-03-10

### ✨ Features
- Vite + React 프로젝트 초기화 및 포트 5174 설정 (41a2763)
- Google Identity Services(GIS) OAuth 2.0 인증 + Sheets API 클라이언트 구현 (41a2763)
- Zustand 스토어 구성 — authStore, settingsStore (localStorage persist) (41a2763)
- 5단계 온보딩 UI — 로그인 → Sheets 사본 → Sheet ID 연동 테스트 → 학교 정보 → 완료 (41a2763)
- TanStack Query v5 전역 설정 및 React Router v6 전체 라우팅 구성 (41a2763)
- PAPS 측정 항목 상수 및 등급 색상 시스템 정의 (41a2763)
- shadcn/ui 기반 UI 컴포넌트 구현 — Button, Card, Input, Label, Badge, Progress, Alert (41a2763)

### 🔧 Chores
- Tailwind CSS v3 + tailwindcss-animate + CSS 변수(shadcn 테마) 설정 (41a2763)
- Radix UI 의존성 설치 — dialog, dropdown-menu, label, progress, select, tabs, toast 등 (41a2763)
- ESLint 설정 및 경고 0개 달성 (41a2763)
- .env.example 제공, .gitignore에 .env 추가 (41a2763)
