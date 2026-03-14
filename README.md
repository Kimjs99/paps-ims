# PAPS-IMS

학교 체력검사(PAPS) 측정·관리 웹앱. Google Sheets를 DB로 사용하는 서버리스 구조.

## 빠른 시작

```bash
bun install
cp .env.example .env   # 환경변수 입력 후
bun run dev            # http://localhost:5174
```

환경변수 설정 방법과 전체 개발 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

## 기술 스택

React 19 · Vite · TailwindCSS · Zustand · TanStack Query · Google Sheets API v4

## 배포

`main` 브랜치 push 시 GitHub Actions가 자동으로 GitHub Pages에 배포합니다.
