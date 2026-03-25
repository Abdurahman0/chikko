import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const configuredBaseUrl = (env.VITE_API_BASE_URL ?? '').trim();
  const proxyTarget = (env.VITE_API_PROXY_TARGET ?? configuredBaseUrl).trim();
  const useApiProxy = env.VITE_API_USE_PROXY !== 'false' && proxyTarget.length > 0;

  return {
    plugins: [react()],
    server: {
      allowedHosts: ['nonofficinal-brent-telepathic.ngrok-free.dev'],
      proxy: useApiProxy
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              headers: {
                'ngrok-skip-browser-warning': 'true',
              },
            },
          }
        : undefined,
    },
  };
});
