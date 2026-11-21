import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api requests go to the FastAPI backend (backend/main.py)
const api = { '/api': 'http://127.0.0.1:8000' }

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
})
