import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Backend API
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Health check
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Static assets served by backend (e.g. /images/...)
      '/images': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
