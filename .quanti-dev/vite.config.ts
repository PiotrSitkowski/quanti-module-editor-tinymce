import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '/Users/piotr/internet-web/Universal_media/Quanti/Quanti-CLI/quanti-module-editor-wysywig-mce/.quanti-dev',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    open: true,
  },
  resolve: {
    alias: {
      '@components': '/Users/piotr/internet-web/Universal_media/Quanti/Quanti-CLI/quanti-module-editor-wysywig-mce/src/components',
      '@hooks':      '/Users/piotr/internet-web/Universal_media/Quanti/Quanti-CLI/quanti-module-editor-wysywig-mce/src/hooks',
      '@locales':    '/Users/piotr/internet-web/Universal_media/Quanti/Quanti-CLI/quanti-module-editor-wysywig-mce/src/locales',
    },
  },
});
