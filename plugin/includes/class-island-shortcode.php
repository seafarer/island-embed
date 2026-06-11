<?php
/**
 * Registers the [wcr_island] shortcode that embeds the built Astro island.
 *
 * Drop it into an Elementor "Shortcode" widget (or any Gutenberg shortcode
 * block):  [wcr_island]
 *
 * How it works: it reads the built `island/index.html` and lifts out exactly
 * what the island needs to hydrate — the stylesheet <link> from <head> and the
 * inner HTML of <body> (Astro's island runtime + the <astro-island> element).
 * Because astro.config.mjs sets `base` to this plugin's path, the asset URLs
 * baked into that markup already resolve correctly, so there is nothing to
 * rewrite and NOTHING to re-paste after a rebuild — rebuild, copy dist/ into
 * island/, done.
 */

if (! defined('ABSPATH')) {
    exit;
}

class WCR_Islands_Shortcode {

    const TAG = 'wcr_island';

    /** Ensures the island CSS is only emitted once even with multiple islands. */
    private bool $css_emitted = false;

    public function register(): void {
        add_shortcode(self::TAG, [$this, 'render']);
    }

    public function render($atts = [], $content = null): string {
        $index = WCR_ISLANDS_DIST_DIR . 'index.html';

        if (! file_exists($index)) {
            // Only surface the problem to users who can fix it.
            if (current_user_can('manage_options')) {
                return '<!-- wcr_island: island/index.html not found. Run `npm run build` and copy dist/ into the plugin\'s island/ folder. -->';
            }
            return '';
        }

        $html = file_get_contents($index);
        if ($html === false) {
            return '';
        }

        $out = '';

        // 1. Stylesheet link(s) from <head>, emitted once per page.
        if (! $this->css_emitted) {
            if (preg_match('/<head\b[^>]*>(.*?)<\/head>/is', $html, $head)
                && preg_match_all('/<link\b[^>]*rel=["\']stylesheet["\'][^>]*>/i', $head[1], $links)) {
                $out .= implode('', $links[0]);
            }
            $this->css_emitted = true;
        }

        // 2. Inner HTML of <body> — Astro's island runtime + the <astro-island>
        //    element, URLs already base-prefixed at build time.
        if (preg_match('/<body\b[^>]*>(.*?)<\/body>/is', $html, $body)) {
            $out .= $body[1];
        }

        return $out;
    }
}
