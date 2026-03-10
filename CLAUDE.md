# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
bun run dev      # 개발 서버 실행 — http://localhost:5174
bun run build    # 프로덕션 빌드
bun run lint     # ESLint 실행 (--max-warnings=0 기준으로 유지)
bun run preview  # 빌드 결과 미리보기
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
```

## Google Sheets 스키마 규칙

- **시트 탭 이름은 영문 고정**: `students`, `measurements`, `grades_standard`, `settings`, `changelog` — 코드가 `SHEET_NAMES` 상수로 직접 참조
- **`settings` 시트 A열 키값 영문 고정**: `SCHEMA_VERSION`, `school_name`, `school_year`, `teacher_name`
- **컬럼 순서 변경 금지**: `students` 시트는 인덱스 기반 파싱 (`row[0]`=학번, `row[1]`=이름, ...) — 순서 변경 시 기존 사본 Sheet 파괴
- **`students` 컬럼 순서** (9개): 학번, 이름, 성별, 학년, 반, 키(cm), 몸무게(kg), 등록일시, 활성여부 — `birth_date` 없음
- **UUID는 클라이언트에서 생성**: `uuid` 라이브러리 사용, 서버 생성 ID 없음

## 라우팅 구조

미완성 페이지(Phase 2~5)는 플레이스홀더로 존재. `ProtectedRoute`는 `isAuthenticated && isOnboardingComplete` 둘 다 충족해야 통과.

```
/onboarding          — 5단계 온보딩 (인증 불필요)
/                    — Home (Protected)
/measure/:classId    — 반별 측정 (Phase 2)
/students            — 학생 관리 (Phase 2)
/settings            — 설정 (Phase 2)
/dashboard/*         — 대시보드 (Phase 3~)
```

## 환경변수

`.env` 파일 필수 (`.env.example` 참고). `VITE_` 접두사 없으면 클라이언트에서 접근 불가.

```
VITE_GOOGLE_CLIENT_ID   — OAuth 2.0 클라이언트 ID
VITE_GOOGLE_API_KEY     — Sheets API 키 (웹사이트 제한 + Sheets API 제한 설정)
VITE_SHEETS_TEMPLATE_ID — 공개 템플릿 Sheet ID (사본 만들기용)
```

## 개발 단계 참조

`../files/` 디렉토리에 단계별 스펙 파일이 있음. 코드 작성 전 해당 Phase 파일 반드시 참조.

| 파일 | 내용 |
|------|------|
| `02_webapp_input.md` | Phase 2 — 학생 관리, 측정 입력, Zod 스키마 |
| `03_dashboard_basic.md` | Phase 3 — 대시보드 |
| `04_analytics.md` | Phase 4 — 분석 고도화 |
| `05_report_export.md` | Phase 5 — 보고서 출력 |
| `06_schema_mgmt.md` | Phase 6 — 스키마 버전 관리 |
| `07_qa_deploy.md` | Phase 7 — QA·배포 |
