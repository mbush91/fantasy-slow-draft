import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['draft.mikebush.org'],
    hmr: {
      host: 'draft.mikebush.org',
      protocol: 'wss',
      clientPort: 443,
    },
  },
})
