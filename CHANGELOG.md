# Changelog

All notable changes to this project will be documented in this file.

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
