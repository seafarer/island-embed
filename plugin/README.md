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

### 1. Point `base` at the plugin's real URL path

`astro.config.mjs` sets, for production builds:

```
base = '/wp-content/plugins/wcr-islands/island'
```

This MUST equal the public URL path of this plugin's `island/` folder. If your
install serves plugins from a different path (e.g. Bedrock's `/app/plugins/…`)
or you rename the plugin, update `PROD_BASE` in `astro.config.mjs` to match —
otherwise the built asset URLs 404 and the browser reports the JS as
`text/html` (WordPress's 404 page).

### 2. Build + deploy in one step

From the repo root, point the deploy script at this plugin's `island/` folder.
It builds, **wipes the old assets**, and copies the fresh `dist/` in — so
`index.html` and `_astro/` always come from the same build (mismatched hashes
are the #1 cause of the island failing to load):

```bash
WCR_PLUGIN_ISLAND_DIR=/path/to/wcr-islands/island npm run deploy
# or:  npm run deploy -- /path/to/wcr-islands/island
```

It prints the exact files it deployed. Then **hard-refresh** the page.

> Doing it by hand instead? Copy the *contents* of `dist/` into `island/` (so
> you get `island/index.html` + `island/_astro/…`), and delete the old `_astro`
> first. Never mix files from two builds.

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
