import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],

  // CRITICAL for Capacitor: assets must be relative (file:// protocol on native)
  base: './',

  // Static files (manifest.json, sw.js, icons/) served from src/app/public
  publicDir: path.resolve(__dirname, 'src/app/public'),

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },

  build: {
    // Raise warning threshold — native bundles are larger than web
    chunkSizeWarningLimit: 1500,
    // esbuild minifier is built into Vite — no extra dep needed
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Split into logical chunks so the WebView doesn't parse everything at startup
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }
          if (id.includes('@capacitor/')) {
            return 'capacitor';
          }
          if (id.includes('@supabase/')) {
            return 'supabase';
          }
          if (id.includes('motion') || id.includes('framer-motion')) {
            return 'motion';
          }
          if (
            id.includes('@radix-ui/') ||
            id.includes('lucide-react') ||
            id.includes('class-variance-authority') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge')
          ) {
            return 'ui';
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) {
            return 'charts';
          }
        },
      },
    },
  },

  // Development server
  server: {
    host: true,          // Expose to LAN for Capacitor live-reload
    port: 5173,
    strictPort: true,
  },
})
