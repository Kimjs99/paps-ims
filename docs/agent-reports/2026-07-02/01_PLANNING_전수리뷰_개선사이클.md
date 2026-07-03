# 01_PLANNING — PAPS 전수 리뷰 개선 사이클 (2026-07-02)

- 트리거 판정: **#4(측정 저장 파이프라인)·#2(인증)·#6(≥10파일)** — 풀 사이클 (MAPE 트리거 체계 재사용)
- 리뷰 입력: 3-에이전트 병렬 전수 리뷰(프론트엔드 / 코어·데이터 / 위생) — 버그 상 8·중 7·하 다수, 중복 9묶음, 분할 후보 6, 위생 6
- 실패 테스트 4건 판정: **전부 테스트가 낡음(구현이 옳음)** — v0.7.2 GIS→커스텀 팝업 전환 및 rowToStudent undefined 계약 변경 미반영

## 배치 계획 (파일 비중첩 병렬 + 순차)

| 배치 | 내용 | 파일 영역 | 실행 |
|------|------|----------|------|
| A | 입력 손실: 30초 폴링 폼/종목 리셋, 재저장 전학급 중복 append(dirty diff), beforeunload | useSheets, StudentMeasure, ClassMeasure | 에이전트 A (B와 병렬) |
| B | 정확성: NaN 파서, BMI 이력 보존, 초등 4~6학년 등록, Report 활성 필터, endurance 키, CSV Zod, 전체 비활성화 범위, 시드 clear+invalidate, gradeProgress 학년, 낡은 테스트 4건 갱신 | api/utils/validators/constants/Report/Students/Settings/Onboarding/useDashboard/test | 에이전트 B (A와 병렬) |
| C | 인증·동시성: 토큰 만료 백그라운드 팝업→강제 로그아웃 완화(재로그인 배너·제스처 시점 갱신), getValidToken in-flight 공유, rowIndex 쓰기 직전 key 재검증(특히 deleteClassHard) | sheetsClient, App, students/measurements/deleteClass | B 완료 후 (파일 겹침) |
| 검증 | 적대적 검증 에이전트 — A+B+C 통합 diff | 읽기 전용 | C 후 |
| 위생 | xlsx 0.20.3, package.json 0.12.x 동기화+버전 규칙 CLAUDE.md 명문화, radix 4종 제거, files/ gitignore, VITE_GOOGLE_API_KEY 정리, dead code(changelog.js 등) | - | 메인 직접 |
| 리팩토링 | 중복 통합(buildGrades 단일화·AREAS 상수·평균 등급 유틸·CSV 유틸·useLogout/ThemeToggle) + 대형 페이지 분해(StudentDetail·ClassMeasure·Report 우선) + 시드 단조성 테스트 | - | 별도 사이클 |
| 마감 | 전체 게이트 → push(=Vercel 자동 배포) → 라이브 검증 → 개발노트·메모리 | - | 메인 |

## 적대적 검증 결과 (2026-07-03, A+B+C 통합 diff)

blocker 0. major 1건(#1)·minor 2건(#2·#3)은 커밋 전 반영 완료, 나머지는 후속 백로그.

- [v] #1 (major) 종목만 변경 시 저장 누락 — `selectDirtyStudents`에 `changedAreas` 파라미터 추가, 종목 baseline 스냅샷(`baselineTypes`) 배선, 테스트 +3
- [v] #2 ROW_MISMATCH 메시지가 측정 페이지 catch에서 은폐 — `err.code === "ROW_MISMATCH"` 분기 추가 (ClassMeasure·StudentMeasure)
- [v] #3 이탈 경고·저장 판정 기준 불일치 — `hasUnsavedChanges`를 `selectDirtyStudents` 동일 기준으로 통일
- [ ] #4 (잠재) 라우트 param만 변경 시 `initializedRef` 미리셋 — 현재 학급→학급 직행 내비 없음. 라우트에서 `key={classId}` 부여 검토
- [ ] #5 설정에서 학교급 변경 시 기준표 미재시드(근본 이슈) + 시드 clear→PUT 비원자성
- [ ] #6 초등 학년 범위 1~6 vs PAPS 기준 3~6 — 명부 관리 목적이면 의도적. 사용자 정책 확인 필요(1~2학년 등록 허용 여부)
- [ ] #7 CSV 오류 행 번호가 빈 줄 있을 때 어긋남 (표기용 사소)

## 정책 보류 → 처리 결과 (2026-07-03, v0.14.0)

1. **BMI 등급 성인 기준** — 공식 학년별·성별 기준표를 웹에서 신뢰 가능한 형태로 확보 실패(교재 PDF에 판정표 없음, 블로그는 중·고 학교급 단위 비공식 수치만). 임의 적용 대신 **UI 참고치 표기**(측정 미리보기·보고서 각주)로 처리. → **공식 기준표(학교 보유 PAPS 매뉴얼/NEIS) 제공 시 정확 반영** 대기.
2. **측정 당시 학년 스키마** — [v] **스키마 v1.1 구현**: measurements T열 `measured_grade`, 저장 시 기록, 재계산 시 사용(구 데이터는 현재 학년 폴백·한계 명시), 마이그레이션 배너로 사용자 승인 시 적용.
3. **implicit flow → PKCE** — **결론: 백엔드 도입 전까지 불가.** Google은 브라우저 전용(공개) 클라이언트의 authorization code 교환에 client_secret을 요구하므로 서버리스 구조에서는 PKCE 단독 전환이 성립하지 않음. 토큰 sessionStorage 격리 + 짧은 만료 + 재로그인 배너(v0.12.1)로 완화 유지. 백엔드(예: Vercel Functions 프록시) 도입 시 재검토.
4. **개인정보 운영 가이드** — [v] `docs/운영가이드_개인정보.md` 작성(시트 공유 설정·스코프 고지·데이터 최소화·사고 대응·가정통신문 문구).
5. **초등 학년 범위** — [v] GRADE_RANGE 초등 1~6 → **3~6 제한**(PAPS 기준표 존재 학년만). 저학년 명부 관리가 필요해지면 되돌릴 수 있음.

## 버전 계획

docs 지연분 커밋(17bc1b6) → 버그 배치 v0.12.1 → 위생 v0.12.2 → 리팩토링 v0.13.0. package.json은 위생 단계에서 CHANGELOG와 동기화 + 규칙 명문화.
