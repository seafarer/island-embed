<?php
/**
 * Registers the [island_embed] shortcode that embeds the built Astro island.
 *
 * Drop it into an Elementor "Shortcode" widget (or any Gutenberg shortcode
 * block):  [island_embed]
 *
 * How it works: it reads the built `island/index.html` and returns the inner
 * HTML of <body> — Astro's island runtime + the <astro-island> element. Because
 * astro.config.mjs sets `base` to this plugin's path, the asset URLs baked into
 * that markup already resolve correctly, so there is nothing to rewrite and
 * NOTHING to re-paste after a rebuild — rebuild, copy dist/ into island/, done.
 *
 * The island's CSS is NOT a separate stylesheet: it is bundled into the island
 * JS and injected inside the island's shadow root at runtime, which is what
 * isolates it from the host theme's CSS. So there is no <link> to enqueue here.
 */

if (! defined('ABSPATH')) {
    exit;
}

class Island_Embed_Shortcode {

    const TAG = 'island_embed';

    public function register(): void {
        add_shortcode(self::TAG, [$this, 'render']);
    }

    public function render($atts = [], $content = null): string {
        $index = ISLAND_EMBED_DIST_DIR . 'index.html';

        if (! file_exists($index)) {
            // Only surface the problem to users who can fix it.
            if (current_user_can('manage_options')) {
                return '<!-- island_embed: island/index.html not found. Run `npm run build` and copy dist/ into the plugin\'s island/ folder. -->';
            }
            return '';
        }

        $html = file_get_contents($index);
        if ($html === false) {
            return '';
        }

        // Inner HTML of <body> — Astro's island runtime + the <astro-island>
        // element, with URLs already base-prefixed at build time.
        if (preg_match('/<body\b[^>]*>(.*?)<\/body>/is', $html, $body)) {
            return $body[1];
        }

        return '';
    }
}
