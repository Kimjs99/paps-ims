# PAPS-IMS

학교 체력검사(PAPS) 측정·관리 웹앱. Google Sheets를 DB로 사용하는 서버리스 구조.

**배포 URL**: https://paps-ims.vercel.app

## 기술 스택

React 19 · Vite · TailwindCSS · Zustand · TanStack Query · Google Sheets API v4

## 빠른 시작

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
| `VITE_GOOGLE_API_KEY` | Sheets API 키 |
| `VITE_SHEETS_TEMPLATE_ID` | 공개 템플릿 Sheet ID |

## 배포

**Vercel**: `main` 브랜치 push 시 자동 배포. SPA 라우팅은 `vercel.json` rewrites로 처리.

배포 후 Google Cloud Console → OAuth 클라이언트 → **승인된 JavaScript 원본**에 배포 도메인 등록 필요.
