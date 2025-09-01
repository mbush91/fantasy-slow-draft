import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const HMR_HOST = process.env.HMR_HOST
const HMR_HTTPS = process.env.HMR_HTTPS === 'true'
const HMR_CLIENT_PORT = process.env.HMR_CLIENT_PORT ? Number(process.env.HMR_CLIENT_PORT) : undefined

const allowed = ['localhost', '127.0.0.1']
if (process.env.ALLOWED_HOSTS) {
  allowed.push(
    ...process.env.ALLOWED_HOSTS.split(',').map((s) => s.trim()).filter(Boolean)
  )
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: allowed,
    ...(HMR_HOST
      ? {
          hmr: {
            host: HMR_HOST,
            protocol: HMR_HTTPS ? 'wss' : 'ws',
            ...(HMR_CLIENT_PORT ? { clientPort: HMR_CLIENT_PORT } : {}),
          },
        }
      : {}),
  },
})
