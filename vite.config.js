import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 让产物使用相对路径，方便 Electron 通过 file:// 加载
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true, port: 5173, strictPort: true }
})
