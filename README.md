# PAPS-IMS

학교 체력검사(PAPS) 측정·관리 웹앱. Google Sheets를 DB로 사용하는 서버리스 구조 — 별도 서버·설치 없이 Google 계정만으로 운영합니다.

**배포 URL**: https://paps-ims.vercel.app · **버전**: v1.0.0

## 주요 기능

- **학생 명단 관리** — 학교마다 다른 기록시트지(CSV·Excel)를 **양식 가져오기 마법사**로 그대로 업로드 (헤더 자동 탐지·컬럼 자동 매핑·학번 자동 생성·남/여 자동 변환·인코딩 자동 감지)
- **측정 입력** — 학급 단위 일괄 입력, 개별 입력, 측정 CSV, 기록시트지 임포트(측정 기록 동시 등록). 입력 중 임시저장
- **PAPS 공식 산출** — 교육부 기준표로 종목별 등급(1~5), 기록→점수(0~20) 환산 총점(100점) 기반 **공식 종합등급** (기록시트지와 동일한 결과)
- **대시보드·분석** — 학년/반/성별 필터, 등급 분포, 레이더·추이·BMI 산점도, 학생 개인 조회
- **보고서** — 학급 보고서·개인 성장 카드 PDF, 원시 데이터 Excel 내보내기
- **다크 모드**, 폰트 자체 호스팅(오프라인·학교망 환경 대응)

## 문서

| 문서 | 대상 |
|------|------|
| [교사 사용 가이드](./docs/교사_사용가이드.md) | 처음 도입하는 선생님 (설정→등록→측정→보고서) |
| [초심자 가이드](./docs/교사_사용가이드_초심자.md) | 스크린샷 중심 상세 안내 |
| [운영 가이드 (개인정보)](./docs/운영가이드_개인정보.md) | 관리자 — 개인정보 취급 주의사항 |
| [CHANGELOG](./CHANGELOG.md) | 버전별 변경 이력 |

## 기술 스택

React 19 · Vite · TailwindCSS · Zustand · TanStack Query · Google Sheets API v4

## 빠른 시작 (개발)

```bash
bun install
cp .env.example .env   # 환경변수 입력 후
bun run dev            # http://localhost:5174
```

환경변수 설정 방법과 전체 개발 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

## 환경변수

| 변수 | 설명 |
|------|------|
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 클라이언트 ID |
| `VITE_SHEETS_TEMPLATE_ID` | 공개 템플릿 Sheet ID |

## 배포

**Vercel**: `main` 브랜치 push 시 자동 배포. SPA 라우팅은 `vercel.json` rewrites로 처리.

배포 후 Google Cloud Console → OAuth 클라이언트 → **승인된 JavaScript 원본**에 배포 도메인 등록 필요.
