import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE || '/SANTANDER/',

    build: {
      outDir:    'SANTANDER',   // CRÍTICO: nombre exacto para el VPS
      emptyOutDir: true,
      rollupOptions: {
        input: {
          // CRÍTICO: los 3 HTML deben estar aquí o dan 404 en producción
          main:       'index.html',
          login:      'login.html',
          adminUsers: 'admin-users.html',
        },
      },
    },

    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api/gv/santander': {
          target: 'http://localhost:4005',
          changeOrigin: true,
          rewrite: p => p.replace(/^\/api\/gv\/santander/, '/api'),
        },
        '/api/intranet': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          rewrite: p => p.replace(/^\/api\/intranet/, ''),
        },
        '/geoserver': {
          target: 'http://200.7.107.14:8080',
          changeOrigin: true,
        },
        '/gv-santander-docs': {
          target: 'http://localhost:4005',
          changeOrigin: true,
          rewrite: p => p.replace(/^\/gv-santander-docs/, ''),
        },
      },
    },
  };
});
