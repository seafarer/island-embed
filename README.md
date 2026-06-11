# WP Astro Islands Prototype

A throwaway prototype validating the **runtime-fetch islands** pattern for the
Artemis landing page. A single Astro page hosts one React island that, on every
page load, fetches recent posts from three WordPress categories via the REST
API and renders them client-side. The post data is **never** baked at build
time — it loads fresh on every page view, so editing/publishing in WordPress is
reflected on refresh with no rebuild.

## Stack

- Astro 5 (static output)
- @astrojs/react, React 18, TypeScript
- Plain global CSS (kept minimal on purpose)

## How it works

- `src/pages/index.astro` renders one island, `<CategoryPosts client:load />`.
- `src/components/CategoryPosts.tsx` is the island. On mount (in a `useEffect`)
  it fetches all three categories in parallel with `Promise.all` and keeps the
  results grouped by category in state. It renders three sections, each listing
  ~4 recent posts (title, date, excerpt, thumbnail, link). It shows a single
  loading state and a single error state for the island as a whole, plus
  per-category messages for empty/failed categories.
- All fetches use a **relative** `/wp-json` path so the same code works in dev
  (via the Vite proxy) and in production (same-origin once embedded in
  WordPress).

## Configure the categories

Edit `src/config.ts`. Each of the three entries takes either a `slug` (resolved
to an ID in the browser at runtime via
`/wp-json/wp/v2/categories?slug=…`) or a numeric `id` (used directly):

```ts
export const CATEGORIES: CategoryConfig[] = [
  { label: 'News', slug: 'news' },
  { label: 'Stories', slug: 'stories' },
  { label: 'Updates', slug: 'updates' },
];
```

> The slugs above are **placeholders**. Replace them with real category slugs
> (or IDs) from the target WordPress site. A category whose slug doesn't resolve
> simply shows an error message in its own section.

## Local development

The dev proxy in `astro.config.mjs` points `/wp-json` at the local WordPress
origin (`http://refugepoint.test`), so there are no CORS issues in dev:

```bash
npm install
npm run dev
```

Open the dev URL. You should see three category sections populated from the live
WordPress site. Edit or publish a post in WordPress, refresh, and the change
appears with no rebuild.

If your local WordPress runs at a different origin, change `WP_ORIGIN` in
`astro.config.mjs`.

## Build

```bash
npm run build
```

Output goes to `dist/`. Because the island data is fetched at runtime, you can
confirm the pattern by opening `dist/index.html` — it contains only the
`Loading recent posts…` placeholder, **not** any post data.

## Embedding in WordPress (copy & paste)

The built page is the island host. Embedding it into an existing WordPress page
takes two steps. **Hashed filenames change on every build**, so re-do this after
each `npm run build`.

### 1. Upload the JS chunks

Copy the entire `dist/_astro/` directory to your WordPress site so its files are
served at the **same origin** under `/_astro/…`. After the latest build the
files are:

```
/_astro/client.CimA0ymp.js          ← React + Astro hydration runtime
/_astro/CategoryPosts.DmHV4bYi.js    ← the island component chunk
/_astro/index._OACqPSs.js            ← page entry (loaded by the runtime)
```

(Run `ls dist/_astro/` to get the current hashed names.)

### 2. Paste the markup

Add a **Custom HTML block** (Gutenberg) or **HTML widget** (Elementor) to the
page, and paste these three pieces, copied verbatim from `dist/index.html`:

1. The `<style>…</style>` block from `<head>` (the island's CSS).
2. The two Astro runtime `<script>…</script>` blocks (the `Astro.load` shim and
   the `astro-island` custom-element definition) that appear just before the
   island element.
3. The island element itself:

   ```html
   <astro-island
     uid="Z29cyvd"
     prefix="r1"
     component-url="/_astro/CategoryPosts.DmHV4bYi.js"
     component-export="default"
     renderer-url="/_astro/client.CimA0ymp.js"
     props="{}"
     ssr
     client="load"
     opts='{"name":"CategoryPosts","value":true}'
     await-children
   ><p class="island-status">Loading recent posts…</p><!--astro:end--></astro-island>
   ```

   The `component-url` and `renderer-url` attributes must match the uploaded
   filenames from step 1.

Once embedded, the relative `/wp-json` fetch is same-origin and works with no
further CORS config.

## Verifying the runtime fetch

- `npm run dev` → three category sections populate from the live site.
- Edit/publish a post in WordPress, refresh → the change shows with no rebuild.
- View-source on the built/embedded page → no post data is present in the
  initial HTML, only the loading placeholder. This proves the fetch happens at
  runtime in the browser.

## Out of scope

No plugin, no custom REST endpoint, no hero/curation/taxonomy logic, no
pagination, no design polish. Just the three-category runtime fetch, embeddable
in WordPress.
