import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Polymarket does not send CORS headers — browser blocks direct calls from localhost.
    // This proxy makes requests same-origin during dev. For production, configure nginx/apache
    // to proxy /polymarket-api → https://gamma-api.polymarket.com (strip prefix).
    proxy: {
      '/polymarket-api': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/polymarket-api/, ''),
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/polymarket-api': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/polymarket-api/, ''),
      },
    },
  },
});


