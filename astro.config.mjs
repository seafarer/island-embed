import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// The local WordPress origin used for the dev proxy.
const WP_ORIGIN = 'http://refugepoint.test';

// In production the island assets are served from inside the WordPress plugin
// that owns them, so the URLs Astro bakes into the markup must point there.
// This MUST match the plugin's folder + island subdir (see plugin/README.md):
//   web root → /wp-content/plugins/wcr-islands/island/_astro/...
const PROD_BASE = '/wp-content/plugins/wcr-islands/island';

// `astro build` sets NODE_ENV=production, while `astro dev` does not — so builds
// get the plugin path automatically and the dev server stays at root.
const isBuild = process.env.NODE_ENV === 'production';

export default defineConfig({
  // Dev stays at root so the proxy + `astro dev` work normally; the build
  // prefixes every asset URL with the plugin path so the built `<astro-island>`
  // chunks resolve once the dist/ folder is dropped into the plugin.
  base: isBuild ? PROD_BASE : '/',
  integrations: [react()],
  build: {
    // Emit the island CSS as a real file in _astro/ (instead of inlining it)
    // so the WordPress plugin can pick it up and enqueue it.
    inlineStylesheets: 'never',
  },
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
