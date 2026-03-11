import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false, // 5174 사용 중이면 자동으로 다음 포트 사용
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/test/**',
        'src/main.jsx',
        // shadcn/ui 자동생성 컴포넌트 (외부 라이브러리 래퍼)
        'src/components/ui/Toaster.jsx',
        'src/components/ui/alert.jsx',
        'src/components/ui/badge.jsx',
        'src/components/ui/button.jsx',
        'src/components/ui/card.jsx',
        'src/components/ui/dialog.jsx',
        'src/components/ui/input.jsx',
        'src/components/ui/label.jsx',
        'src/components/ui/progress.jsx',
        'src/components/ui/select.jsx',
        'src/components/ui/table.jsx',
        // 레이아웃 (Router 종속)
        'src/components/layout/**',
        // 대규모 페이지 컴포넌트 (Router + Query 종속 - Phase 2~5 미완성)
        'src/pages/**',
        'src/App.jsx',
        // React Query hooks (외부 API 종속)
        'src/hooks/**',
        // API changelog (미사용)
        'src/api/changelog.js',
      ],
    },
  },
})
