import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split only heavy, self-contained libs to avoid circular chunk warnings.
            // React/Radix stay in vendor (they're shared by many chunks).
            if (id.includes('@mui/material') || id.includes('@mui/icons-material') || id.includes('@emotion')) {
              return 'mui';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('react-router') || id.includes('@remix-run')) {
              return 'router';
            }
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            if (id.includes('socket.io-client')) {
              return 'socket';
            }
            if (id.includes('date-fns') || id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-dates';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'forms';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
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
      // Socket.IO (WebSocket + long polling)
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
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
      // Public assets (event banners, etc.)
      '/public': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
