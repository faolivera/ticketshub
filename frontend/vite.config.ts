import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

/**
 * Public assets under /assets/* so Caddy (and dev) only need one static handler.
 * - Dev: serve public at /assets/* (same URLs as prod).
 * - Build: copy public into outDir/assets/ (no HTML rewrite; index and app use /assets/... from the start).
 */
function publicToAssetsPlugin() {
  let resolvedConfig: { root: string; publicDir: string; outDir: string }
  return {
    name: 'public-to-assets',
    configResolved(config) {
      resolvedConfig = {
        root: config.root,
        publicDir: path.resolve(config.root, config.publicDir || 'public'),
        outDir: path.resolve(config.root, config.build.outDir),
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/assets\/(.+)$/)
        if (!match) return next()
        const name = decodeURIComponent(match[1]).replace(/\.\./g, '')
        const filePath = path.resolve(resolvedConfig.publicDir, name)
        const rel = path.relative(resolvedConfig.publicDir, filePath)
        if (rel.startsWith('..') || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next()
        }
        res.setHeader('Content-Type', server.config.server.mimeTypes?.get(path.extname(name)) ?? 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      const { publicDir, outDir } = resolvedConfig
      const assetsDir = path.join(outDir, 'assets')
      if (!fs.existsSync(publicDir)) return

      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })
      const entries = fs.readdirSync(publicDir, { withFileTypes: true })
      for (const e of entries) {
        const src = path.join(publicDir, e.name)
        const dest = path.join(assetsDir, e.name)
        if (e.isDirectory()) {
          fs.cpSync(src, dest, { recursive: true })
        } else {
          fs.copyFileSync(src, dest)
        }
      }
    },
  }
}

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
    react(),
    tailwindcss(),
    publicToAssetsPlugin(),
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
