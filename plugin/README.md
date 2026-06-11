# WCR Islands — reference plugin

A **reference** WordPress plugin showing how the production site owns the three
concerns the Astro prototype hands off to WordPress:

1. **Taxonomy / curation** — which posts appear in each group (stubbed here).
2. **The custom REST route** the island fetches at runtime.
3. **The island assets + the shortcode** that embeds them, Elementor-friendly.

It is meant to be **copied into the real plugin repo and adapted** — it is not
wired into this Astro repo's build.

```
plugin/
  wcr-islands.php                      Plugin bootstrap + constants
  includes/
    class-feed-route.php               GET /wp-json/wcr/v1/landing-feed
    class-island-shortcode.php         [wcr_island] shortcode
  island/                              ← drop the Astro build output here
    .gitkeep                           (built assets are git-ignored)
```

## How the pieces fit

- The React island (`src/components/CategoryPosts.tsx`) does **one** runtime
  fetch to `/wp-json/wcr/v1/landing-feed` and renders whatever groups come back.
- `class-feed-route.php` returns those groups already assembled server-side, so
  all the taxonomy/curation logic stays in PHP and the client stays dumb. The
  response is sent `Cache-Control: no-store`, so publishing a post shows up on
  the next page load with no rebuild.
- `class-island-shortcode.php` reads the built `island/index.html` and lifts out
  the stylesheet `<link>` and the `<body>` inner HTML (Astro's island runtime +
  the `<astro-island>` element). Because `base` is set at build time (below),
  the asset URLs are already correct — **nothing to re-paste after a rebuild.**

## Setup

### 1. Build the island with the matching `base`

`astro.config.mjs` sets, for production builds:

```
base = '/wp-content/plugins/wcr-islands/island'
```

This MUST equal the public URL path of this plugin's `island/` folder. If your
install serves plugins from a different path (e.g. Bedrock's `/app/plugins/…`)
or you rename the plugin, update `PROD_BASE` in `astro.config.mjs` to match.

From the repo root (`astro build` applies the production `base` automatically):

```bash
npm run build
```

### 2. Drop the build into the plugin

Copy the **contents** of `dist/` into `island/` so you have:

```
island/index.html
island/_astro/...
```

### 3. Activate and embed

Activate the plugin, then add a **Shortcode** widget (Elementor) or shortcode
block (Gutenberg) to the page:

```
[wcr_island]
```

The runtime + island element are injected; the island hydrates, attaches a
shadow root, injects its own CSS into it, and fetches the feed at runtime.
Same-origin, so no CORS config — and the shadow root keeps the host theme's CSS
from cascading into the island (and vice versa).

## The route contract

`GET /wp-json/wcr/v1/landing-feed`:

```json
{
  "groups": [
    {
      "key": "news",
      "label": "News",
      "posts": [
        {
          "id": 1,
          "title": "A plain-text title",
          "date": "2026-01-01T00:00:00+00:00",
          "excerpt": "Plain text, HTML already stripped server-side.",
          "link": "https://refugepoint.test/some-post/",
          "thumbnail": "https://refugepoint.test/wp-content/uploads/x.jpg"
        }
      ]
    }
  ]
}
```

`thumbnail` is `null` when a post has no featured image. The
`groups_config()` method in `class-feed-route.php` is the stub to replace with
the real custom-taxonomy source.

## What to harden before production

This is a prototype reference, not production code. Before shipping, consider:

- Replacing `category_name` with the real custom-taxonomy query.
- Server-side caching of the feed (a short transient) if the query is heavy —
  while keeping the HTTP response uncached so edits still appear on refresh.
- The island's CSS lives inside its shadow root, so there's no theme stylesheet
  to enqueue or de-conflict. If you ever need to theme the island from outside,
  expose CSS custom properties on `:host` (they pierce the shadow boundary)
  rather than reaching into its markup.
