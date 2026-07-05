import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue() as any],
  server: {
    port: 5173,
  },
})
