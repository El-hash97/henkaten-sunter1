import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiDevMiddleware } from './server/dev-api'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      tailwindcss(),
      react(),
      {
        name: 'dev-api',
        configureServer(server) {
          server.middlewares.use(apiDevMiddleware())
        },
      },
    ],
  }
})
