# WP Astro Islands Prototype

A prototype validating the **runtime-fetch islands** pattern for the Artemis
landing page. A single Astro page hosts one React island that, on every page
load, fetches a landing-page feed from a custom WordPress REST route and renders
it client-side. The post data is **never** baked at build time — it loads fresh
on every page view, so editing/publishing in WordPress is reflected on refresh
with no rebuild.

> **Two layers, one repo.** The Astro app (`src/`) is the island. The
> production WordPress side — a custom feed route + an Elementor-friendly embed —
> lives as a **reference plugin in [`plugin/`](./plugin)** that you copy into the
> real WordPress plugin repo. See [`plugin/README.md`](./plugin/README.md).

## Stack

- Astro 5 (static output)
- @astrojs/react, React 18, TypeScript
- Plain global CSS (kept minimal on purpose)

## How it works

- `src/pages/index.astro` renders one island, `<CategoryPosts client:load />`,
  as the only thing in `<body>` (so the plugin's shortcode can lift the body
  verbatim).
- `src/components/CategoryPosts.tsx` is the island. On mount (in a `useEffect`)
  it makes a **single** fetch to the custom feed route and renders the groups it
  gets back — one section per group, each listing recent posts (title, date,
  excerpt, thumbnail, link). The grouping/curation is done server-side, so the
  client just renders. Simple island-wide loading and error states.
- The fetch uses a **relative** `/wp-json` path so the same code works in dev
  (via the Vite proxy) and in production (same-origin once embedded in
  WordPress).

## The data contract

The island fetches one route, configured in `src/config.ts`:

```
GET /wp-json/wcr/v1/landing-feed
→ { "groups": [ { "key", "label", "posts": [ { id, title, date, excerpt, link, thumbnail } ] } ] }
```

The route returns the groups already assembled, with `excerpt` as plain text and
`thumbnail` as a URL or `null`. It's implemented in the reference plugin
([`plugin/includes/class-feed-route.php`](./plugin/includes/class-feed-route.php)),
where the real custom-taxonomy/curation logic belongs.

## Local development

The dev proxy in `astro.config.mjs` points `/wp-json` at the local WordPress
origin (`http://refugepoint.test`), so there are no CORS issues in dev:

```bash
npm install
npm run dev
```

Open the dev URL. With the feed route available on the WordPress site, you'll
see the category sections populate. Edit or publish a post, refresh, and the
change appears with no rebuild.

If your local WordPress runs at a different origin, change `WP_ORIGIN` in
`astro.config.mjs`.

## Build

```bash
npm run build
```

`astro build` applies the plugin `base` path automatically (see below); the dev
server stays at root. Output goes
to `dist/`. Because the data is fetched at runtime, `dist/index.html` contains
only the `Loading recent posts…` placeholder — **no post data** — which is the
proof that the fetch happens at runtime in the browser.

## Embedding in WordPress

Production embedding is handled by the reference plugin, which makes the
hashed-filename churn disappear — rebuild, copy `dist/` into the plugin, done. No
markup to re-paste. The full steps are in
[`plugin/README.md`](./plugin/README.md). In short:

1. `astro.config.mjs` sets, for production builds,
   `base = '/wp-content/plugins/wcr-islands/island'` — the public path of the
   plugin's `island/` folder. Adjust if your plugin path differs.
2. `npm run build`, then copy the contents of `dist/` into the plugin's
   `island/` folder.
3. Add the `[wcr_island]` shortcode to the page via an Elementor Shortcode widget
   (or a Gutenberg shortcode block). The shortcode reads the built `index.html`
   and injects the stylesheet link, the Astro island runtime, and the
   `<astro-island>` element — URLs already correct from the `base` setting.

Once embedded, the relative `/wp-json` fetch is same-origin and works with no
CORS config.

## Verifying the runtime fetch

- `npm run dev` → the category sections populate from the feed route.
- Edit/publish a post in WordPress, refresh → the change shows with no rebuild.
- View-source on the built/embedded page → no post data in the initial HTML,
  only the loading placeholder. This proves the fetch happens at runtime.
