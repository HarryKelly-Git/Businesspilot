import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          // Bundle every lucide icon into ONE chunk. Without this, Vite emits a
          // separate ~1KB file per icon (50+ tiny files), and on high-latency
          // mobile connections each is its own round-trip — the main cause of
          // the app feeling slow to load.
          'vendor-ui': ['react-hot-toast', 'clsx', 'tailwind-merge', 'lucide-react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
});
