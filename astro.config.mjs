import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// The local WordPress origin used for the dev proxy.
// In production the built island is embedded inside a WordPress page, so the
// relative `/wp-json` fetch is already same-origin and this proxy is unused.
const WP_ORIGIN = 'http://refugepoint.test';

export default defineConfig({
  integrations: [react()],
  vite: {
    server: {
      proxy: {
        // Proxy the WordPress REST API so the island can fetch a relative
        // `/wp-json` path in dev without hitting CORS. Mirrors the
        // same-origin setup the island sees once embedded in WordPress.
        '/wp-json': { target: WP_ORIGIN, changeOrigin: true },
      },
    },
  },
});
