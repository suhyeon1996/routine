import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 주소(https://suhyeon1996.github.io/routine)에 맞춘 경로
export default defineConfig({
  base: '/routine/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
