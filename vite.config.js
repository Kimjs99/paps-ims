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
})
