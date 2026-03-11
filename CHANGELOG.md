# Changelog

All notable changes to this project will be documented in this file.

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
